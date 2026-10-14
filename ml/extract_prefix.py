"""Extract a bounded, attributable real-data sample from a gzip dump prefix.
A range-limited or interrupted gzip download is allowed; its incomplete final record is discarded.
Usage: python ml/extract_prefix.py /tmp/prefix.gz ml/data/training-sample.jsonl
"""
import argparse, collections, hashlib, json, math, zlib
from datetime import datetime, timezone
from pathlib import Path
FEATURES=['energy-kcal_100g','sugars_100g','carbohydrates_100g','sodium_100g','saturated-fat_100g','proteins_100g','fiber_100g']
def main():
    p=argparse.ArgumentParser();p.add_argument('prefix',type=Path);p.add_argument('destination',type=Path);args=p.parse_args()
    decompressor=zlib.decompressobj(31);buffer=b'';counts=collections.Counter();seen=set();total=0;digest=hashlib.sha256();compressed=0
    args.destination.parent.mkdir(parents=True,exist_ok=True)
    # Snapshot the current length so a still-running download cannot change selection mid-run.
    remaining=args.prefix.stat().st_size
    with args.prefix.open('rb') as source,args.destination.open('w') as out:
        while remaining:
            chunk=source.read(min(65536,remaining));remaining-=len(chunk);compressed+=len(chunk);digest.update(chunk)
            lines=(buffer+decompressor.decompress(chunk)).split(b'\n');buffer=lines.pop()
            for line in lines:
                total+=1
                try:
                    record=json.loads(line);grade=record.get('nutriscore',{}).get('2023',{}).get('grade');n=record.get('nutriments',{});values=[n.get(f) for f in FEATURES]
                    if grade not in list('abcde') or not record.get('code') or not record.get('product_name'):continue
                    if any(not isinstance(v,(float,int)) or not math.isfinite(v) or v<0 for v in values):continue
                    if values[0]>1000 or any(v>100 for v in values[1:]):continue
                    if str(record['code']) in seen:continue
                    seen.add(str(record['code']));counts[grade]+=1
                    compact={key:record.get(key) for key in ['code','product_name','brands','categories_tags']}
                    compact['nutriments']={f:n[f] for f in FEATURES};compact['nutriscore']={'2023':{'grade':grade}}
                    out.write(json.dumps(compact,sort_keys=True)+'\n')
                except (ValueError,TypeError,AttributeError):continue
    manifest={'source':'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz','license':'ODbL-1.0','extractedAt':datetime.now(timezone.utc).isoformat(),'selection':'Complete records from a byte prefix of the public dump; deduplicated complete nutrition and 2023 labels. This is not a random or globally representative sample.','compressedPrefixBytes':compressed,'compressedPrefixSha256':digest.hexdigest(),'completeSourceRecords':total,'eligibleProducts':len(seen),'gradeCounts':dict(counts),'sampleSha256':hashlib.sha256(args.destination.read_bytes()).hexdigest()}
    Path(__file__).with_name('snapshot.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
