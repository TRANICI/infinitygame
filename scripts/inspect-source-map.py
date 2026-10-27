"""Read-only VPK inspection. Extract individual files into test-results/source-map."""
import argparse
import io
import struct
from pathlib import Path

class VPK:
    def __init__(self, path):
        self.path=Path(path)
        with self.path.open('rb') as f:
            magic,version,size=struct.unpack('<III',f.read(12))
            assert magic==0x55aa1234 and version in (1,2)
            self.offset=(28 if version==2 else 12)+size
            if version==2:f.read(16)
            tree=io.BytesIO(f.read(size))
        def string():
            result=bytearray()
            while (c:=tree.read(1)) not in (b'\0',b''):result.extend(c)
            return result.decode('utf-8')
        self.entries={}
        while ext:=string():
            while directory:=string():
                while name:=string():
                    crc,preload,archive,offset,length,term=struct.unpack('<IHHIIH',tree.read(18))
                    assert term==0xffff
                    key=('/' if directory==' ' else directory+'/')+name+'.'+ext
                    self.entries[key.lstrip('/')]=(archive,offset,length,tree.read(preload))
    def read(self,key):
        archive,offset,length,preload=self.entries[key]
        path=self.path if archive==0x7fff else self.path.with_name(self.path.stem.removesuffix('_dir')+f'_{archive:03d}.vpk')
        with path.open('rb') as f:
            f.seek(offset+(self.offset if archive==0x7fff else 0))
            return preload+f.read(length)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('vpk');parser.add_argument('--filter',default='dust2');parser.add_argument('--extract')
    args=parser.parse_args();vpk=VPK(args.vpk)
    if args.extract:
        out=Path(__file__).resolve().parents[1]/'test-results'/'source-map';out.mkdir(parents=True,exist_ok=True)
        dest=out/Path(args.extract).name;dest.write_bytes(vpk.read(args.extract));print(dest)
    else:
        for name,(_,_,size,_) in vpk.entries.items():
            if args.filter in name:print(name,size)
