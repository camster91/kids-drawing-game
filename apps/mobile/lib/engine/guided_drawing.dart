import 'dart:math';
import 'types.dart';

class TracingPath {
  final String id;final String name;
  final List<Point> points;final String color;
  final double lineWidth;
  bool completed;
  TracingPath({required this.id,required this.name,required this.points,required this.color,this.lineWidth=3,this.completed=false});
}

List<Point> _arcPoints(double cx,double cy,double rx,double ry,{int segs=50}){
  final pts=<Point>[];
  for(int i=0;i<=segs;i++){
    final a=pi+(i/segs)*pi;
    pts.add(Point(cx+cos(a)*rx,cy+sin(a)*ry));
  }
  return pts;
}

List<Point> createCirclePath(double cx,double cy,double r,{int segments=60}){
  final pts=<Point>[];
  for(int i=0;i<=segments;i++){
    final a=(i/segments)*pi*2;
    pts.add(Point(cx+cos(a)*r,cy+sin(a)*r));
  }
  return pts;
}

List<Point> createStarPath(double cx,double cy,double outerR,{int points=5,int segs=8}){
  final innerR=outerR*0.4;
  final step=(pi*2)/(points*2);
  final corners=<Point>[];
  for(int i=0;i<points*2+1;i++){
    final r=i%2==0?outerR:innerR;
    final a=i*step-pi/2;
    corners.add(Point(cx+cos(a)*r,cy+sin(a)*r));
  }
  final pts=<Point>[];
  for(int i=0;i<corners.length-1;i++){
    final a=corners[i],b=corners[i+1];
    for(int j=0;j<segs;j++){
      final t=j/segs;
      pts.add(Point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));
    }
  }
  return pts;
}

List<Point> createHousePath(double cx,double cy,{double size=150}){
  final s=size;
  final corners=[
    Point(cx-s/2,cy+s/2),Point(cx+s/2,cy+s/2),
    Point(cx+s/2,cy-s/4),Point(cx,cy-s),
    Point(cx-s/2,cy-s/4),Point(cx-s/2,cy+s/2),
  ];
  final pts=<Point>[];
  for(int i=0;i<corners.length;i++){
    final a=corners[i],b=corners[(i+1)%corners.length];
    for(int j=0;j<12;j++){
      final t=j/12;
      pts.add(Point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t));
    }
  }
  return pts;
}

List<Point> createSpiralPath(double cx,double cy,double innerR,double outerR,{double turns=3,int segments=120}){
  final pts=<Point>[];
  for(int i=0;i<=segments;i++){
    final t=i/segments;
    final a=t*turns*pi*2;
    final r=innerR+(outerR-innerR)*t;
    pts.add(Point(cx+cos(a)*r,cy+sin(a)*r));
  }
  return pts;
}

final builtinLessons=[
  _Lesson(name:'Circle',paths:[TracingPath(id:'circle',name:'Circle',points:createCirclePath(200,200,80),color:'#94a3b8',lineWidth:3)]),
  _Lesson(name:'Star',paths:[TracingPath(id:'star',name:'Star',points:createStarPath(200,200,80),color:'#94a3b8',lineWidth:3)]),
  _Lesson(name:'House',paths:[TracingPath(id:'house',name:'House',points:createHousePath(200,200,size:130),color:'#94a3b8',lineWidth:3)]),
  _Lesson(name:'Rainbow Arc',paths:[
    TracingPath(id:'arc1',name:'Red Arc',points:_arcPoints(200,220,75,95),color:'#ef4444',lineWidth:8),
    TracingPath(id:'arc2',name:'Orange Arc',points:_arcPoints(200,220,65,85),color:'#f97316',lineWidth:8),
    TracingPath(id:'arc3',name:'Yellow Arc',points:_arcPoints(200,220,55,75),color:'#eab308',lineWidth:8),
    TracingPath(id:'arc4',name:'Green Arc',points:_arcPoints(200,220,45,65),color:'#22c55e',lineWidth:8),
    TracingPath(id:'arc5',name:'Blue Arc',points:_arcPoints(200,220,35,55),color:'#3b82f6',lineWidth:8),
  ]),
];

class _Lesson{final String name;final List<TracingPath> paths;_Lesson({required this.name,required this.paths});}

double checkTracing(List<Point> drawn,List<Point> guide,{double tolerance=35}){
  int matched=0;
  final step=max(1,(guide.length/40).floor());
  int sampled=0;
  for(int i=0;i<guide.length;i+=step){
    sampled++;
    final g=guide[i];
    final close=drawn.any((p)=> sqrt((p.x-g.x)*(p.x-g.x)+(p.y-g.y)*(p.y-g.y))<=tolerance);
    if(close)matched++;
  }
  return matched/(max(1,sampled)*0.6);
}
