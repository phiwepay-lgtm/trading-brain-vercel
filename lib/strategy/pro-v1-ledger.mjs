// Pro V1 research foundation, not a broker/platform emulator. Every valid
// signal can start an independent position, including opposite directions.
// This does not establish that the draft detector matches the user's charts.

const validBar = b => b && Number.isSafeInteger(b.time) && b.time % 60 === 0 &&
  [b.open,b.high,b.low,b.close].every(x => Number.isFinite(x) && x > 0) &&
  b.low <= Math.min(b.open,b.close) && b.high >= Math.max(b.open,b.close) && b.low <= b.high;

export class IndependentPositionLedger {
  constructor() {
    this.open=[];
    this.closed=[];
    this.censored=[];
    this.invalidSignals=0;
    this.lastTime=null;
    this.nextId=1;
  }

  // Called at each confirmed M1 bar before processing any new close signal.
  // Missing intervals make the fate of previously open brackets unknowable.
  advance(bar) {
    if (!validBar(bar) || (this.lastTime!==null && bar.time<=this.lastTime)) throw new Error('Invalid or unordered M1 bar');
    const previousTime=this.lastTime;
    this.lastTime=bar.time;
    if (previousTime!==null && bar.time-previousTime!==60) {
      for (const position of this.open) this.censored.push({...position,lastTime:previousTime,gapObservedAt:bar.time,reason:'missing M1 interval'});
      this.open=[];
      return;
    }
    const stillOpen=[];
    for (const position of this.open) {
      if (bar.time<=position.time) { stillOpen.push(position); continue; }
      const {direction,stop,target,price}=position;
      // If the first observed price gaps through a bracket, the opening price
      // determines the side reached, subject to the simplified OHLC model.
      let exit=null, reason=null;
      if ((direction===1 && bar.open<=stop)||(direction===-1 && bar.open>=stop)) {exit=bar.open;reason='stop gap';}
      else if ((direction===1 && bar.open>=target)||(direction===-1 && bar.open<=target)) {exit=bar.open;reason='target gap';}
      else {
        const stopTouched=direction===1 ? bar.low<=stop : bar.high>=stop;
        const targetTouched=direction===1 ? bar.high>=target : bar.low<=target;
        if (stopTouched && targetTouched) {
          this.censored.push({...position,lastTime:bar.time,reason:'stop and target touched; intrabar order unknown'});
          continue;
        }
        if (stopTouched) {exit=stop;reason='stop';}
        else if (targetTouched) {exit=target;reason='target';}
      }
      if (exit===null) stillOpen.push(position);
      else this.closed.push({...position,exitTime:bar.time,exit,reason,r:direction*(exit-price)/Math.abs(price-stop)});
    }
    this.open=stillOpen;
  }

  // Only accepts a signal after its own bar is processed; new positions cannot
  // be exited retroactively within their signal candle. No costs are modeled.
  enter(event) {
    const {time,direction,price,stop,target}=event || {};
    if (time!==this.lastTime || !Number.isSafeInteger(time) || ![1,-1].includes(direction) ||
        ![price,stop,target].every(x=>Number.isFinite(x)&&x>0) ||
        (direction===1 ? !(stop<price && price<target) : !(target<price && price<stop))) {
      this.invalidSignals++;
      return null;
    }
    const position={...event,id:this.nextId++};
    this.open.push(position);
    return position.id;
  }
}
