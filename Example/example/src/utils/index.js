let ref;
let lastTime;
const debounce = (func, timer) => {
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
export default debounce;
