const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const photoURL = (id, thumbnail = false) => `/photos/scrapbook/${encodeURIComponent(id)}${thumbnail ? '-thumb' : ''}.webp`;
const categories = [['all', 'All our pages'], ['firsts', 'Our firsts'], ['everyday', 'Everyday you'], ['distance', 'Across the miles'], ['little-love', 'Little love notes']];

export function scrapbookMarkup(items) {
  const photoCount = items.reduce((sum, item) => sum + item.images.length, 0);
  return `<div class="scrapbook-intro"><span class="scrapbook-stamp">VOL. 01 · JASON & YAN</span><span class="handwritten">a little messy, a lot in love ♡</span></div>
    <div class="section-heading"><div><span class="eyebrow">REAL PHOTOS. OUR LITTLE STORY.</span><h2>Our little <em>scrapbook.</em></h2></div><p>${photoCount} photos. ${items.length} pages. So much us.<br>Tap a keepsake to read Ko Ko’s note.</p></div>
    <div class="scrapbook-filters" role="group" aria-label="Filter scrapbook pages">${categories.map(([id, label]) => `<button data-filter="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('')}</div>
    <p class="scrapbook-help" lang="my">ပုံလေးကို နှိပ်ပြီး ကိုကို့စာလေး ဖတ်ကြည့်နော် ♡</p>
    <div class="scrapbook-grid">${items.map((item, index) => `<button class="scrapbook-card ${item.color} ${item.kind === 'chat' ? 'chat-keepsake' : ''}" data-page="${index}" data-category="${item.category}" aria-label="Open scrapbook page ${index + 1}: ${escapeHTML(item.title)}"><span class="paper-tape" aria-hidden="true"></span><div class="scrapbook-picture"><img src="${photoURL(item.images[0], true)}" alt="${escapeHTML(item.subtitle)}" loading="lazy" decoding="async" width="480" height="640">${item.images.length > 1 ? `<span class="photo-count">${item.images.length} photos</span>` : ''}<span class="page-tag">${String(index + 1).padStart(2, '0')} / ${items.length}</span></div><div class="scrapbook-caption"><span class="handwritten">${escapeHTML(item.stamp)}</span><h3>${escapeHTML(item.title)}</h3><p lang="my">${escapeHTML(item.subtitle)}</p><span class="scrapbook-open">${item.kind === 'chat' ? 'A little chat, a big feeling' : 'A moment worth keeping'} <span aria-hidden="true">↗</span></span></div></button>`).join('')}</div>
    <p id="filter-status" class="filter-status" role="status">All ${items.length} pages, kept with love.</p>
    <dialog class="scrapbook-dialog" id="scrapbook-dialog" aria-labelledby="scrapbook-title"><header class="scrapbook-dialog-header"><button id="close-scrapbook" aria-label="Close memory and return to scrapbook">← Back to scrapbook</button><span id="page-position"></span><button class="round-close" id="scrapbook-x" aria-label="Close memory">×</button></header><div id="scrapbook-page"></div></dialog>
    <dialog class="photo-viewer" id="photo-viewer" aria-label="Full-screen memory photo"><header class="photo-viewer-header"><button id="close-photo" aria-label="Close photo and return to note">← Back to note</button><span id="photo-position"></span><button class="round-close" id="photo-x" aria-label="Close full-screen photo">×</button></header><div class="photo-viewer-scroll" id="photo-viewer-scroll"><img id="full-photo" alt=""></div><div class="photo-viewer-controls"><button id="previous-photo" aria-label="Previous photo">←</button><button id="zoom-photo" aria-pressed="false">Zoom in +</button><button id="next-photo" aria-label="Next photo">→</button></div><p class="photo-viewer-hint">Pinch to zoom on your phone, or use Zoom in. Swipe/scroll to read enlarged chats.</p></dialog>`;
}

export function bindScrapbook(items) {
  const dialog = document.getElementById('scrapbook-dialog');
  const viewer = document.getElementById('photo-viewer');
  const page = document.getElementById('scrapbook-page');
  let current = 0;
  let photoIndex = 0;
  let selectedFilter = 'all';
  let gestureStart = null;
  function filteredIndexes() {
    return items.map((item, index) => selectedFilter === 'all' || item.category === selectedFilter ? index : -1).filter(index => index >= 0);
  }
  function closeDialog() { if (viewer.open) viewer.close(); dialog.close(); }
  document.getElementById('close-scrapbook').addEventListener('click', closeDialog);
  document.getElementById('scrapbook-x').addEventListener('click', closeDialog);
  document.getElementById('close-photo').addEventListener('click', () => viewer.close());
  document.getElementById('photo-x').addEventListener('click', () => viewer.close());
  for (const modal of [dialog, viewer]) {
    modal.addEventListener('click', event => {
      const box = modal.getBoundingClientRect();
      if (event.target === modal && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) modal.close();
    });
    modal.addEventListener('close', () => { if (!dialog.open && !viewer.open) document.body.classList.remove('viewing-memory'); });
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    selectedFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    document.querySelectorAll('[data-page]').forEach(card => { card.hidden = selectedFilter !== 'all' && card.dataset.category !== selectedFilter; });
    document.getElementById('filter-status').textContent = `${filteredIndexes().length} pages in ${button.textContent.toLowerCase()}.`;
  }));
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => openPage(Number(button.dataset.page))));

  function openPage(index) {
    if (!items[index]) return;
    current = index;
    photoIndex = 0;
    const item = items[index];
    document.getElementById('page-position').textContent = `${index + 1} / ${items.length}`;
    const indexes = filteredIndexes();
    const position = indexes.indexOf(index);
    page.innerHTML = `<div class="scrapbook-reel ${item.kind === 'chat' ? 'chat-reel' : ''}" aria-label="Memory photos; swipe for more" tabindex="0">${item.images.map((id, number) => `<button class="reel-photo" data-enlarge="${number}" aria-label="View full-size photo ${number + 1}"><img src="${photoURL(id)}" alt="${escapeHTML(item.subtitle)}${item.images.length > 1 ? ` — ${number + 1} of ${item.images.length}` : ''}" width="800" height="1100"><span>Tap to see the whole photo & zoom ↗</span></button>`).join('')}</div>${item.images.length > 1 ? `<div class="reel-dots" aria-label="Choose a photo">${item.images.map((_, number) => `<button data-slide="${number}" aria-label="Photo ${number + 1}" aria-pressed="${number === 0}">${number + 1}</button>`).join('')}<span>Swipe for the next little keepsake →</span></div>` : ''}<div class="scrapbook-note"><span class="eyebrow">A LITTLE NOTE FROM KO KO</span><h2 id="scrapbook-title">${escapeHTML(item.title)}</h2><p class="scrapbook-note-subtitle" lang="my">${escapeHTML(item.subtitle)}</p><p class="burmese scrapbook-prose" lang="my">${escapeHTML(item.text)}</p><p class="handwritten scrapbook-signature">Kept with love, Jason ♡</p></div><nav class="scrapbook-pagination" aria-label="Browse memories"><button id="page-previous" ${position <= 0 ? 'disabled' : ''}>← Previous page</button><button id="page-next" ${position >= indexes.length - 1 ? 'disabled' : ''}>Next page →</button></nav><button class="back-to-pages" id="back-to-pages">Back to our scrapbook ♡</button>`;
    page.querySelector('#page-previous').addEventListener('click', () => openPage(indexes[position - 1]));
    page.querySelector('#page-next').addEventListener('click', () => openPage(indexes[position + 1]));
    page.querySelector('#back-to-pages').addEventListener('click', closeDialog);
    page.querySelectorAll('[data-enlarge]').forEach(button => button.addEventListener('click', () => openPhoto(Number(button.dataset.enlarge))));
    const reel = page.querySelector('.scrapbook-reel');
    function slideTo(number) { reel.scrollTo({ left: number * reel.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
    page.querySelectorAll('[data-slide]').forEach(button => button.addEventListener('click', () => slideTo(Number(button.dataset.slide))));
    reel.addEventListener('scroll', () => {
      photoIndex = Math.max(0, Math.min(item.images.length - 1, Math.round(reel.scrollLeft / reel.clientWidth)));
      page.querySelectorAll('[data-slide]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.slide) === photoIndex)));
    }, { passive: true });
    reel.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        slideTo(Math.max(0, Math.min(item.images.length - 1, photoIndex + (event.key === 'ArrowRight' ? 1 : -1))));
      }
    });
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('viewing-memory');
    dialog.scrollTop = 0;
  }

  function openPhoto(number) {
    photoIndex = number;
    const item = items[current];
    const image = document.getElementById('full-photo');
    const scroller = document.getElementById('photo-viewer-scroll');
    scroller.classList.remove('zoomed');
    scroller.scrollTo(0, 0);
    const zoom = document.getElementById('zoom-photo');
    zoom.textContent = 'Zoom in +';
    zoom.setAttribute('aria-pressed', 'false');
    image.src = photoURL(item.images[number]);
    image.alt = `${item.subtitle} — photo ${number + 1} of ${item.images.length}`;
    document.getElementById('photo-position').textContent = `${number + 1} / ${item.images.length}`;
    document.getElementById('previous-photo').disabled = number === 0;
    document.getElementById('next-photo').disabled = number === item.images.length - 1;
    if (!viewer.open) viewer.showModal();
  }
  document.getElementById('previous-photo').addEventListener('click', () => openPhoto(photoIndex - 1));
  document.getElementById('next-photo').addEventListener('click', () => openPhoto(photoIndex + 1));
  document.getElementById('zoom-photo').addEventListener('click', event => {
    const scroller = document.getElementById('photo-viewer-scroll');
    const zoomed = scroller.classList.toggle('zoomed');
    event.currentTarget.textContent = zoomed ? 'Fit to screen −' : 'Zoom in +';
    event.currentTarget.setAttribute('aria-pressed', String(zoomed));
  });
  const scroller = document.getElementById('photo-viewer-scroll');
  scroller.addEventListener('touchstart', event => {
    gestureStart = !scroller.classList.contains('zoomed') && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  scroller.addEventListener('touchend', event => {
    if (!gestureStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - gestureStart.x;
    const dy = event.changedTouches[0].clientY - gestureStart.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const next = photoIndex + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < items[current].images.length) openPhoto(next);
    }
    gestureStart = null;
  }, { passive: true });
}
