/* Shared behaviour: photo fallback, mobile menu, footer year, scroll reveal */
document.documentElement.classList.add('js-reveal');

/* Photo slots: drop in home-hero-1.jpg OR .png / .jpeg / .webp with the same name.
   If the .jpg has been removed, the page quietly tries the other formats. */
(function () {
  var order = ['jpg', 'png', 'jpeg', 'webp'];
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG' || img.src.indexOf('/photos/') === -1) return;
    var m = img.src.match(/^(.*)\.(jpg|png|jpeg|webp)(\?.*)?$/i);
    if (!m) return;
    var tried = (img.getAttribute('data-tried') || m[2].toLowerCase()).split(',');
    var next = order.filter(function (x) { return tried.indexOf(x) === -1; })[0];
    if (!next) return;
    img.setAttribute('data-tried', tried.concat(next).join(','));
    img.src = m[1] + '.' + next;
  }, true);
})();

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.js-year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var btn = document.getElementById('nav-toggle');
  var menu = document.getElementById('mobile-menu');
  var icon = document.getElementById('nav-icon');
  if (btn && menu) {
    var setOpen = function (open) {
      menu.classList.toggle('hidden', !open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (icon) { icon.classList.toggle('fa-bars', !open); icon.classList.toggle('fa-xmark', open); }
    };
    btn.addEventListener('click', function () { setOpen(menu.classList.contains('hidden')); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setOpen(false); });
  }

  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }
});
