"""Stream the public dataset to disk; a full dump can require substantial space."""
import argparse, urllib.request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('destination',type=Path);a=p.parse_args()
url='https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz'
request=urllib.request.Request(url,headers={'User-Agent':'Foodwise/1.0 dataset downloader'})
a.destination.parent.mkdir(parents=True,exist_ok=True)
with urllib.request.urlopen(request,timeout=60) as response,a.destination.open('wb') as handle:
    while data:=response.read(1024*1024):handle.write(data)
print(a.destination)
