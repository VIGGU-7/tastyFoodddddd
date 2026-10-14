"""Train only from actual Open Food Facts records; never synthesize labels.
Usage: python ml/train.py /path/openfoodfacts-products.jsonl.gz --max-products 100000
"""
import argparse, collections, gzip, hashlib, json, re, sys
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, classification_report, confusion_matrix
from sklearn.model_selection import StratifiedGroupKFold

FEATURES = ['energy-kcal_100g','sugars_100g','carbohydrates_100g','sodium_100g','saturated-fat_100g','proteins_100g','fiber_100g']
CLASSES = list('abcde')

def prepare(p):
    score = p.get('nutriscore', {}).get('2023', {})
    grade = score.get('grade')
    if grade not in CLASSES or not p.get('code') or not p.get('product_name'): return None
    n = p.get('nutriments', {})
    vals = [n.get(f) for f in FEATURES]
    if any(not isinstance(v,(int,float)) or not np.isfinite(v) or v < 0 for v in vals): return None
    if vals[0] > 1000 or any(v > 100 for v in vals[1:]): return None
    # Use raw taxonomy category, never Nutri-Score-derived tags.
    cats = [c for c in p.get('categories_tags', []) if c.startswith('en:') and not any(x in c for x in ['nutri-score','nutrition-grade','nova-'])]
    category = cats[0] if cats else 'unknown'
    # Keep all variants of a brand/category together. Fallback groups by normalized name.
    brand = re.sub(r'[^a-z0-9]', '', str(p.get('brands','')).lower().split(',')[0])
    name = re.sub(r'[^a-z ]','',p['product_name'].lower())
    group = f'{brand}:{category}' if brand else ' '.join(name.split()[:3])
    return {'code':str(p['code']),'x':vals,'grade':grade,'category':category,'group':group}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('dataset',type=Path);parser.add_argument('--max-products',type=int,default=100000);args=parser.parse_args()
    records=[];seen=set();digest=hashlib.sha256()
    opener=gzip.open if args.dataset.suffix=='.gz' else open
    with opener(args.dataset,'rt',encoding='utf-8') as handle:
        for line in handle:
            try: row=prepare(json.loads(line))
            except (ValueError,TypeError,AttributeError): continue
            if row and row['code'] not in seen:
                seen.add(row['code']);records.append(row);digest.update(json.dumps(row,sort_keys=True).encode())
            if len(records)>=args.max_products: break
    if len(records)<500: sys.exit('Need at least 500 complete, deduplicated real products with 2023 labels.')
    counts=collections.Counter(r['grade'] for r in records)
    if any(counts[c]<25 for c in CLASSES): sys.exit('Need at least 25 products in each grade.')
    y=np.array([r['grade'] for r in records]);groups=np.array([r['group'] for r in records]);dummy=np.zeros(len(records))
    folds=list(StratifiedGroupKFold(n_splits=5,shuffle=True,random_state=42).split(dummy,y,groups))
    test=folds[0][1];validation=folds[1][1];train=np.concatenate([folds[i][1] for i in [2,3,4]])
    for indexes in [train,validation,test]:
        if set(y[indexes])!=set(CLASSES): sys.exit('A split is missing a grade; obtain a larger or more diverse dataset.')
    assert not set(groups[train]) & set(groups[test]);assert not set(groups[validation]) & set(groups[test]);assert not set(groups[train]) & set(groups[validation])
    categories=sorted(set(records[i]['category'] for i in train))
    x=np.array([r['x']+[int(r['category']==c) for c in categories] for r in records],dtype=np.float32)
    best=None;best_score=-1
    for depth in [8,12]:
        model=RandomForestClassifier(n_estimators=48,max_depth=depth,min_samples_leaf=3,class_weight='balanced',random_state=42,n_jobs=-1)
        model.fit(x[train],y[train]);score=f1_score(y[validation],model.predict(x[validation]),average='macro')
        if score>best_score:best=model;best_score=score
    prediction=best.predict(x[test]);majority=collections.Counter(y[train]).most_common(1)[0][0]
    accuracy=accuracy_score(y[test],prediction);baseline=accuracy_score(y[test],[majority]*len(test))
    metrics={'accuracy':accuracy,'macroF1':f1_score(y[test],prediction,average='macro'),'baselineAccuracy':baseline,'validationMacroF1':best_score,'perGrade':classification_report(y[test],prediction,output_dict=True,zero_division=0),'confusionMatrix':confusion_matrix(y[test],prediction,labels=CLASSES).tolist(),'samples':{'train':len(train),'validation':len(validation),'test':len(test),'total':len(records)},'labelVersion':'2023','datasetSha256':digest.hexdigest(),'splitSeed':42,'trainedAt':datetime.now(timezone.utc).isoformat()}
    trees=[]
    for estimator in best.estimators_:
        t=estimator.tree_;prob=t.value[:,0,:];prob=prob/prob.sum(axis=1,keepdims=True)
        trees.append({'left':t.children_left.tolist(),'right':t.children_right.tolist(),'feature':t.feature.tolist(),'threshold':t.threshold.tolist(),'probabilities':prob.tolist()})
    artifact={'status':'trained','version':'off-2023-'+digest.hexdigest()[:12],'metrics':metrics,'classes':best.classes_.tolist(),'features':FEATURES,'categories':categories,'trees':trees}
    target=Path(__file__).resolve().parents[1]/'src/features/nutrition/domain/model-artifact.json'
    # Verify exported inference parity against sklearn before shipping.
    for idx in test[:200]:
        probs=np.zeros(len(best.classes_))
        for t in trees:
            node=0
            while t['left'][node]!=-1:node=t['left'][node] if x[idx][t['feature'][node]]<=t['threshold'][node] else t['right'][node]
            probs+=np.array(t['probabilities'][node])/len(trees)
        assert best.classes_[np.argmax(probs)]==best.predict(x[idx:idx+1])[0]
    fixtures=[{'nutrients':dict(zip(FEATURES,records[int(idx)]['x'])),'category':records[int(idx)]['category'],'expected':str(best.predict(x[idx:idx+1])[0])} for idx in test[:200]]
    Path(__file__).with_name('parity-fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
    manifest=Path(__file__).with_name('snapshot.json')
    if manifest.exists():metrics['snapshot']=json.loads(manifest.read_text())
    target.write_text(json.dumps(artifact,separators=(',',':'))+'\n')
    Path(__file__).with_name('metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
    print(json.dumps(metrics,indent=2))
    if accuracy<=baseline:print('WARNING: model does not beat the baseline; evaluate dataset quality before relying on estimates.',file=sys.stderr)
if __name__=='__main__':main()
