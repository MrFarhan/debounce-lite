let ref;
let lastTime;
export const UserTypedDebounce = (func, timer) => {
  if (ref) {
    clearTimeout(ref);
    // ref = null;
    // timer = Date.now() - lastTime;
  }
  ref = setTimeout(() => {
    func();
    lastTime = 0;
    ref = null;
  }, timer);
  lastTime = Date.now() + timer;
};

let ref1;
let lastTime1;
export const TimeBasedDebounce = (func, timer) => {
  if (ref1) {
    clearTimeout(ref1);
    ref1 = null;
    timer = Date.now() - lastTime1;
  }
  ref1 = setTimeout(() => {
    func();
    lastTime1 = 0;
    ref1 = null;
  }, timer);
  lastTime1 = Date.now() + timer;
};
