'use strict';

var fs   = require('fs');
var path = require('path');
var shared = require('./products-renderer');

var navHTML    = shared.navHTML;
var footerHTML = shared.footerHTML;
var commonCSS  = shared.commonCSS;
var loadSite   = shared.loadSite;

var SOLUTIONS_PATH = path.join(__dirname, 'solutions.json');

function loadSolutions() {
  return JSON.parse(fs.readFileSync(SOLUTIONS_PATH, 'utf8')).solutions;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÇÖZÜMLER LİSTESİ SAYFASI  /cozumler
// ─────────────────────────────────────────────────────────────────────────────
function renderSolutionList() {
  var solutions = loadSolutions();
  var site = loadSite();
  var pc = site.settings.primary_color  || '#2c5530';
  var sc = site.settings.secondary_color|| '#4a7c59';
  var ac = site.settings.accent_color   || '#7cb342';

  var cards = solutions.map(function(s) {
    return '<a href="/cozumler?id=' + s.id + '" class="sol-detail-card">'
      + '<div class="sol-detail-img" style="background-image:url(\'' + s.photo + '\')"></div>'
      + '<div class="sol-detail-body">'
      + '<h3>' + s.title + '</h3>'
      + '<p>' + s.shortDesc + '</p>'
      + '<span class="sol-detail-cta">Detaylar →</span>'
      + '</div></a>';
  }).join('');

  return '<!DOCTYPE html><html lang="tr"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Çözümlerimiz | ' + site.settings.site_name + '</title>'
    + commonCSS(pc, sc, ac)
    + '<style>'
    + '.page-hero { margin-top:70px; background:var(--dark); padding:4rem 0; text-align:center; color:#fff; }\n'
    + '.page-hero h1 { font-size:2.8rem; font-weight:800; margin-bottom:1rem; }\n'
    + '.page-hero p { font-size:1.1rem; color:rgba(255,255,255,.7); max-width:600px; margin:0 auto; }\n'
    + '.accent-line { width:60px; height:4px; background:var(--grad); border-radius:2px; margin:.8rem auto 0; }\n'
    + '.sol-detail-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:2rem; padding:3rem 0 4rem; }\n'
    + '.sol-detail-card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:var(--shadow); transition:transform .25s,box-shadow .25s; }\n'
    + '.sol-detail-card:hover { transform:translateY(-8px); box-shadow:0 20px 50px rgba(0,0,0,.13); }\n'
    + '.sol-detail-img { height:180px; background-size:cover; background-position:center; }\n'
    + '.sol-detail-body { padding:1.5rem; }\n'
    + '.sol-detail-body h3 { font-size:1.3rem; font-weight:800; margin-bottom:.6rem; }\n'
    + '.sol-detail-body p { font-size:.9rem; color:var(--light); line-height:1.7; margin-bottom:1rem; }\n'
    + '.sol-detail-cta { font-size:.85rem; font-weight:700; color:var(--ac); }\n'
    + '</style>'
    + '</head><body>'
    + navHTML(site)
    + '<div class="page-hero"><div class="container">'
    + '<h1>Çözümlerimiz</h1>'
    + '<p>Sahadan sunucuya, her sektörden ihtiyaca karşılık veren elektronik, IoT ve yazılım çözümleri.</p>'
    + '<div class="accent-line"></div>'
    + '</div></div>'
    + '<div class="container"><div class="sol-detail-grid">' + cards + '</div></div>'
    + footerHTML(site)
    + '<script>'
    + 'var mm=document.getElementById("mobile-menu");'
    + 'var nl=document.querySelector(".nav-links");'
    + 'if(mm){mm.addEventListener("click",function(){nl.classList.toggle("active");mm.classList.toggle("active");});}'
    + 'var mst=document.createElement("style");'
    + 'mst.textContent="@media(max-width:768px){.nav-links.active{display:flex;position:fixed;top:68px;left:0;right:0;background:rgba(255,255,255,.98);flex-direction:column;padding:2rem;box-shadow:0 10px 30px rgba(0,0,0,.1);z-index:999;}.nav-links.active li{margin:.5rem 0;}}";\n'
    + 'document.head.appendChild(mst);'
    + '</script>'
    + '</body></html>';
}

// ─────────────────────────────────────────────────────────────────────────────
// ÇÖZÜM DETAY SAYFASI  /cozumler?id=...
// ─────────────────────────────────────────────────────────────────────────────
function renderSolutionDetail(solutionId) {
  var solutions = loadSolutions();
  var site = loadSite();
  var pc = site.settings.primary_color  || '#2c5530';
  var sc = site.settings.secondary_color|| '#4a7c59';
  var ac = site.settings.accent_color   || '#7cb342';

  var s = null;
  for (var i = 0; i < solutions.length; i++) {
    if (solutions[i].id === solutionId) { s = solutions[i]; break; }
  }
  if (!s) return null;

  var sectionsHTML = s.article.sections.map(function(sec) {
    return '<div class="sol-section">'
      + '<h2 class="sec-title">' + sec.heading + '</h2>'
      + '<p class="sol-body">' + sec.body + '</p>'
      + '</div>';
  }).join('');

  var related = solutions.filter(function(x) { return x.id !== s.id; }).slice(0, 3);
  var relatedHTML = related.length > 0
    ? '<section class="related"><div class="container"><h2>Diğer Çözümler</h2><div class="related-grid">'
      + related.map(function(r) {
          return '<div class="rel-card" onclick="location.href=\'/cozumler?id=' + r.id + '\'">'
            + '<div class="rel-img"><img src="' + r.photo + '" alt="' + r.title + '" loading="lazy"></div>'
            + '<h4>' + r.title + '</h4>'
            + '<p>' + r.shortDesc + '</p>'
            + '<span>Detaylar →</span>'
            + '</div>';
        }).join('')
      + '</div></div></section>'
    : '';

  return '<!DOCTYPE html><html lang="tr"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + s.title + ' | ' + site.settings.site_name + '</title>'
    + commonCSS(pc, sc, ac)
    + '<style>'
    + '.sol-hero { margin-top:70px; height:320px; background-size:cover; background-position:center; position:relative; }\n'
    + '.sol-hero::before { content:""; position:absolute; inset:0; background:linear-gradient(180deg,rgba(10,24,40,.55),rgba(10,24,40,.85)); }\n'
    + '.sol-hero-inner { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; justify-content:center; }\n'
    + '.breadcrumb { font-size:.82rem; color:rgba(255,255,255,.6); margin-bottom:.75rem; }\n'
    + '.breadcrumb a { color:rgba(255,255,255,.6); } .breadcrumb a:hover { color:var(--ac); }\n'
    + '.sol-hero-inner h1 { color:#fff; font-size:2.3rem; font-weight:800; max-width:700px; }\n'
    + '.content-section { padding:3.5rem 0; }\n'
    + '.sol-lead { font-size:1.05rem; color:var(--text); line-height:1.85; max-width:800px; margin-bottom:2.5rem; }\n'
    + '.sol-section { max-width:800px; margin-bottom:2rem; }\n'
    + '.sol-section:last-child { margin-bottom:0; }\n'
    + 'h2.sec-title { font-size:1.4rem; font-weight:800; margin-bottom:.75rem; color:var(--text); }\n'
    + '.sol-body { font-size:.98rem; color:var(--light); line-height:1.85; }\n'
    + '.cta-band { background:var(--grad); border-radius:24px; padding:3rem; text-align:center; color:#fff; margin:0 0 4rem; }\n'
    + '.cta-band h3 { font-size:1.8rem; font-weight:800; margin-bottom:.75rem; }\n'
    + '.cta-band p { opacity:.85; margin-bottom:1.5rem; }\n'
    + '.btn-white { display:inline-block; padding:.85rem 2.2rem; background:#fff; color:var(--pc); border-radius:50px; font-weight:700; transition:.2s; }\n'
    + '.btn-white:hover { transform:translateY(-2px); box-shadow:0 10px 25px rgba(0,0,0,.2); }\n'
    + '.related { background:#fff; padding:4rem 0 3rem; }\n'
    + '.related h2 { font-size:1.6rem; font-weight:800; margin-bottom:2rem; }\n'
    + '.related-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1.5rem; }\n'
    + '.rel-card { border:2px solid #f0f0f0; border-radius:16px; padding:1.5rem; cursor:pointer; transition:.2s; text-align:center; }\n'
    + '.rel-card:hover { border-color:var(--ac); transform:translateY(-4px); box-shadow:var(--shadow); }\n'
    + '.rel-img { width:100%; height:120px; border-radius:12px; overflow:hidden; margin-bottom:.75rem; }\n'
    + '.rel-img img { width:100%; height:100%; object-fit:cover; display:block; }\n'
    + '.rel-card h4 { font-size:1.05rem; font-weight:800; margin-bottom:.3rem; }\n'
    + '.rel-card p { font-size:.82rem; color:var(--light); margin-bottom:.75rem; }\n'
    + '.rel-card span { font-size:.82rem; font-weight:700; color:var(--ac); }\n'
    + '@media(max-width:768px){ .sol-hero-inner h1{font-size:1.7rem;} }\n'
    + '</style>'
    + '</head><body>'
    + navHTML(site)
    + '<div class="sol-hero" style="background-image:url(\'' + s.photo + '\')">'
    + '<div class="container sol-hero-inner">'
    + '<p class="breadcrumb"><a href="/">Ana Sayfa</a> / <a href="/cozumler">Çözümler</a> / ' + s.title + '</p>'
    + '<h1>' + s.title + '</h1>'
    + '</div></div>'
    + '<div class="content-section"><div class="container">'
    + '<p class="sol-lead">' + s.article.lead + '</p>'
    + sectionsHTML
    + '</div></div>'
    + '<div class="container">'
    + '<div class="cta-band">'
    + '<h3>' + s.title + ' hakkında bilgi almak ister misiniz?</h3>'
    + '<p>Uzman ekibimiz size en uygun çözümü sunmak için hazır.</p>'
    + '<a href="/#iletisim" class="btn-white">İletişime Geçin</a>'
    + '</div></div>'
    + relatedHTML
    + footerHTML(site)
    + '<script>'
    + 'var mm=document.getElementById("mobile-menu");'
    + 'var nl=document.querySelector(".nav-links");'
    + 'if(mm){mm.addEventListener("click",function(){nl.classList.toggle("active");mm.classList.toggle("active");});}'
    + 'var mst=document.createElement("style");'
    + 'mst.textContent="@media(max-width:768px){.nav-links.active{display:flex;position:fixed;top:68px;left:0;right:0;background:rgba(255,255,255,.98);flex-direction:column;padding:2rem;box-shadow:0 10px 30px rgba(0,0,0,.1);z-index:999;}.nav-links.active li{margin:.5rem 0;}}";\n'
    + 'document.head.appendChild(mst);'
    + '</script>'
    + '</body></html>';
}

module.exports = {
  renderSolutionList:   renderSolutionList,
  renderSolutionDetail: renderSolutionDetail
};
