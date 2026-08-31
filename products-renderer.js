'use strict';

var fs   = require('fs');
var path = require('path');

var PRODUCTS_PATH  = path.join(__dirname, 'products.json');
var SITE_DATA_PATH = path.join(__dirname, 'site-data.json');

function loadProducts() { return JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf8')); }
function loadSite()     { return JSON.parse(fs.readFileSync(SITE_DATA_PATH, 'utf8')); }

// products.json ürünleri kategoriler içine iç içe tutar (categories[].products[]).
// Sayfa oluşturucular tek düz bir liste bekler; burada kategori bilgisini
// (id/isim/ikon) her ürüne taşıyarak düzleştiriyoruz.
function flattenProducts(data) {
  var all = [];
  data.categories.forEach(function(c) {
    c.products.forEach(function(p) {
      var merged = {};
      for (var key in p) { merged[key] = p[key]; }
      merged.category     = c.id;
      merged.categoryName = c.name;
      merged.categoryIcon = c.icon;
      all.push(merged);
    });
  });
  return all;
}

// Nested { "Sekme Adı": [ { title, items[] } ] } özellik verisini
// sekmeli bir bölüm listesi olarak render eder.
function renderSpecs(specs) {
  if (!specs) return '';
  var out = '';
  Object.keys(specs).forEach(function(tabName) {
    out += '<div class="spec-tab-group">'
      + '<h3 class="spec-tab-title">' + tabName + '</h3>';
    specs[tabName].forEach(function(block) {
      out += '<div class="spec-block">'
        + '<h4 class="spec-block-title">' + block.title + '</h4>'
        + '<ul class="spec-items">'
        + block.items.map(function(item) { return '<li>' + item + '</li>'; }).join('')
        + '</ul></div>';
    });
    out += '</div>';
  });
  return out;
}

// ── Ortak nav/footer parçaları ────────────────────────────────────────────────
function navHTML(site) {
  return '<nav id="navbar">'
    + '<div class="nav-container">'
    + '<a href="/" class="logo">' + site.settings.logo_text + '</a>'
    + '<ul class="nav-links">'
    + '<li><a href="/">Ana Sayfa</a></li>'
    + '<li><a href="/urunler" class="active-link">Ürünler</a></li>'
    + '<li><a href="/#about">Hakkımızda</a></li>'
    + '<li><a href="/#contact">İletişim</a></li>'
    + '</ul>'
    + '<div class="menu-toggle" id="mobile-menu"><span></span><span></span><span></span></div>'
    + '</div></nav>';
}

function footerHTML(site) {
  var s = site.settings;
  return '<footer class="footer">'
    + '<div class="container">'
    + '<div class="footer-inner">'
    + '<div><a href="/" class="logo-footer">' + s.logo_text + '</a>'
    + '<p>' + s.footer_copyright + '</p></div>'
    + '<div class="footer-links">'
    + '<a href="/">Ana Sayfa</a><a href="/urunler">Ürünler</a><a href="/#about">Hakkımızda</a><a href="/#contact">İletişim</a>'
    + '</div></div>'
    + '<div class="footer-bottom"><p>' + s.footer_bottom + '</p></div>'
    + '</div></footer>';
}

// ── Ortak CSS ─────────────────────────────────────────────────────────────────
function commonCSS(pc, sc, ac) {
  return '<style>\n'
    + '* { margin:0; padding:0; box-sizing:border-box; }\n'
    + ':root {'
    + ' --pc:' + pc + '; --sc:' + sc + '; --ac:' + ac + ';'
    + ' --dark:#1a1a2e; --text:#2e2e2e; --light:#666; --white:#fff;'
    + ' --bg:#f8fffe; --shadow:0 8px 30px rgba(0,0,0,0.08);'
    + ' --grad:linear-gradient(135deg,' + pc + ',' + sc + ',' + ac + ');'
    + '}\n'
    + 'body { font-family:"Inter",-apple-system,sans-serif; color:var(--text); background:var(--bg); overflow-x:hidden; }\n'
    + 'a { text-decoration:none; }\n'
    + '.container { max-width:1200px; margin:0 auto; padding:0 2rem; }\n'
    /* nav */
    + 'nav { position:fixed; top:0; width:100%; background:rgba(255,255,255,0.96); backdrop-filter:blur(12px); z-index:1000; padding:.9rem 0; box-shadow:0 2px 20px rgba(0,0,0,0.06); }\n'
    + '.nav-container { max-width:1200px; margin:0 auto; padding:0 2rem; display:flex; justify-content:space-between; align-items:center; }\n'
    + '.logo { font-size:1.7rem; font-weight:800; background:var(--grad); background-clip:text; -webkit-background-clip:text; -webkit-text-fill-color:transparent; }\n'
    + '.nav-links { display:flex; list-style:none; gap:2rem; }\n'
    + '.nav-links a { color:var(--text); font-weight:500; font-size:.95rem; transition:.2s; padding:.3rem 0; position:relative; }\n'
    + '.nav-links a::after { content:""; position:absolute; bottom:-4px; left:0; width:0; height:2px; background:var(--ac); transition:.3s; }\n'
    + '.nav-links a:hover::after, .nav-links a.active-link::after { width:100%; }\n'
    + '.nav-links a.active-link { color:var(--ac); }\n'
    + '.menu-toggle { display:none; flex-direction:column; cursor:pointer; gap:4px; }\n'
    + '.menu-toggle span { width:25px; height:3px; background:var(--text); transition:.3s; }\n'
    /* footer */
    + '.footer { background:var(--dark); color:#fff; padding:2.5rem 0 1rem; margin-top:5rem; }\n'
    + '.footer-inner { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem; margin-bottom:2rem; }\n'
    + '.logo-footer { font-size:1.5rem; font-weight:800; background:var(--grad); background-clip:text; -webkit-background-clip:text; -webkit-text-fill-color:transparent; display:block; margin-bottom:.5rem; }\n'
    + '.footer-inner p { color:rgba(255,255,255,.6); font-size:.85rem; }\n'
    + '.footer-links { display:flex; gap:1.5rem; flex-wrap:wrap; }\n'
    + '.footer-links a { color:rgba(255,255,255,.7); font-size:.9rem; transition:.2s; }\n'
    + '.footer-links a:hover { color:var(--ac); }\n'
    + '.footer-bottom { border-top:1px solid rgba(255,255,255,.1); padding-top:1rem; text-align:center; color:rgba(255,255,255,.4); font-size:.8rem; }\n'
    /* responsive nav */
    + '@media(max-width:768px){'
    + '.nav-links{display:none;} .menu-toggle{display:flex;}'
    + '.footer-inner{flex-direction:column;text-align:center;}'
    + '.footer-links{justify-content:center;}'
    + '}\n'
    + '</style>\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// ÜRÜN LİSTESİ SAYFASI  /urunler
// ─────────────────────────────────────────────────────────────────────────────
function renderProductList() {
  var data    = loadProducts();
  var site    = loadSite();
  var pc = site.settings.primary_color  || '#2c5530';
  var sc = site.settings.secondary_color|| '#4a7c59';
  var ac = site.settings.accent_color   || '#7cb342';

  var allProducts = flattenProducts(data);

  var catTabs = data.categories.map(function(c, i) {
    return '<button class="cat-tab' + (i===0?' active':'') + '" data-cat="' + c.id + '">' + c.name + '</button>';
  }).join('');

  var cards = allProducts.map(function(p) {
    var badge = p.badge
      ? '<span class="badge" style="background:' + p.badgeColor + '">' + p.badge + '</span>'
      : '';
    return '<div class="product-card" data-cat="' + p.category + '" onclick="location.href=\'/urun/' + p.id + '\'">'
      + '<div class="card-img">'
      + '<img src="' + (p.image || '') + '" alt="' + p.name + '" loading="lazy">'
      + badge
      + '</div>'
      + '<div class="card-body">'
      + '<p class="card-cat">' + p.categoryName + '</p>'
      + '<h3 class="card-name">' + p.name + '</h3>'
      + '<p class="card-tagline">' + (p.highlight || p.variant || '') + '</p>'
      + '<p class="card-desc">' + p.shortDesc + '</p>'
      + '<div class="card-footer">'
      + '<span class="card-price">' + (p.price || 'Fiyat için iletişime geçin') + '</span>'
      + '<span class="card-cta">Detaylar →</span>'
      + '</div>'
      + '</div></div>';
  }).join('');

  return '<!DOCTYPE html><html lang="tr"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Ürünler | ' + site.settings.site_name + '</title>'
    + commonCSS(pc, sc, ac)
    + '<style>'
    + '.page-hero { margin-top:70px; background:var(--dark); padding:4rem 0; text-align:center; color:#fff; }\n'
    + '.page-hero h1 { font-size:2.8rem; font-weight:800; margin-bottom:1rem; }\n'
    + '.page-hero p { font-size:1.1rem; color:rgba(255,255,255,.7); max-width:600px; margin:0 auto; }\n'
    + '.accent-line { width:60px; height:4px; background:var(--grad); border-radius:2px; margin:.8rem auto 0; }\n'
    + '.filter-bar { display:flex; gap:.75rem; flex-wrap:wrap; justify-content:center; padding:2.5rem 0 1.5rem; }\n'
    + '.cat-tab { padding:.55rem 1.4rem; border:2px solid #ddd; background:#fff; border-radius:50px; font-weight:600; font-size:.9rem; cursor:pointer; transition:.2s; color:var(--text); }\n'
    + '.cat-tab:hover { border-color:var(--ac); color:var(--ac); }\n'
    + '.cat-tab.active { background:var(--grad); border-color:transparent; color:#fff; }\n'
    + '.products-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:2rem; padding:1rem 0 4rem; }\n'
    + '.product-card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:var(--shadow); cursor:pointer; transition:transform .25s,box-shadow .25s; }\n'
    + '.product-card:hover { transform:translateY(-8px); box-shadow:0 20px 50px rgba(0,0,0,0.13); }\n'
    + '.card-img { background:var(--grad); height:180px; position:relative; overflow:hidden; }\n'
    + '.card-img img { width:100%; height:100%; object-fit:cover; display:block; }\n'
    + '.badge { position:absolute; top:1rem; right:1rem; padding:.3rem .8rem; border-radius:50px; font-size:.75rem; font-weight:700; color:#fff; }\n'
    + '.card-body { padding:1.5rem; }\n'
    + '.card-cat { font-size:.78rem; font-weight:700; color:var(--ac); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.4rem; }\n'
    + '.card-name { font-size:1.35rem; font-weight:800; margin-bottom:.25rem; }\n'
    + '.card-tagline { font-size:.88rem; color:var(--ac); font-weight:600; margin-bottom:.75rem; }\n'
    + '.card-desc { font-size:.88rem; color:var(--light); line-height:1.7; margin-bottom:1.2rem; }\n'
    + '.card-footer { display:flex; justify-content:space-between; align-items:center; }\n'
    + '.card-price { font-size:.9rem; font-weight:700; color:var(--pc); }\n'
    + '.card-cta { font-size:.85rem; font-weight:700; color:var(--ac); }\n'
    + '.product-card:hover .card-cta { text-decoration:underline; }\n'
    + '.product-count { text-align:center; color:var(--light); font-size:.9rem; margin-bottom:1rem; }\n'
    + '@media(max-width:600px){ .products-grid{grid-template-columns:1fr;} .page-hero h1{font-size:2rem;} }\n'
    + '</style>'
    + '</head><body>'
    + navHTML(site)
    + '<div class="page-hero"><div class="container">'
    + '<h1>' + data.page.title + '</h1>'
    + '<p>' + data.page.subtitle + '</p>'
    + '<div class="accent-line"></div>'
    + '</div></div>'
    + '<div class="container">'
    + '<div class="filter-bar">' + catTabs + '</div>'
    + '<p class="product-count" id="count"></p>'
    + '<div class="products-grid" id="grid">' + cards + '</div>'
    + '</div>'
    + footerHTML(site)
    + '<script>'
    + 'var tabs = document.querySelectorAll(".cat-tab");'
    + 'var cards = document.querySelectorAll(".product-card");'
    + 'function updateCount(){'
    + '  var v=0; cards.forEach(function(c){if(c.style.display!=="none")v++;});'
    + '  document.getElementById("count").textContent = v + " ürün gösteriliyor";'
    + '}'
    + 'tabs.forEach(function(tab){'
    + '  tab.addEventListener("click",function(){'
    + '    tabs.forEach(function(t){t.classList.remove("active");});'
    + '    this.classList.add("active");'
    + '    var cat=this.dataset.cat;'
    + '    cards.forEach(function(c){'
    + '      c.style.display=(cat==="tumu"||c.dataset.cat===cat)?"":"none";'
    + '    });'
    + '    updateCount();'
    + '  });'
    + '});'
    + 'updateCount();'
    /* nav scroll */
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
// ÜRÜN DETAY SAYFASI  /urun/:id
// ─────────────────────────────────────────────────────────────────────────────
function renderProductDetail(productId) {
  var data = loadProducts();
  var site = loadSite();
  var pc = site.settings.primary_color  || '#2c5530';
  var sc = site.settings.secondary_color|| '#4a7c59';
  var ac = site.settings.accent_color   || '#7cb342';

  var allProducts = flattenProducts(data);

  var p = null;
  for (var i=0; i<allProducts.length; i++) {
    if (allProducts[i].id === productId) { p = allProducts[i]; break; }
  }
  if (!p) return null;

  var catLabel = p.categoryName;

  var specsHTML = renderSpecs(p.specs);

  var featuresHTML = (p.tags || []).map(function(f) {
    return '<li><span class="feat-check">✓</span>' + f + '</li>';
  }).join('');

  // İlgili ürünler (aynı kategori, kendisi hariç, max 3)
  var related = allProducts.filter(function(x){ return x.id!==p.id && x.category===p.category; }).slice(0,3);
  var relatedHTML = related.length > 0
    ? '<section class="related"><div class="container"><h2>İlgili Ürünler</h2><div class="related-grid">'
      + related.map(function(r){
          return '<div class="rel-card" onclick="location.href=\'/urun/'+r.id+'\'">'
            + '<div class="rel-img"><img src="' + (r.image || '') + '" alt="' + r.name + '" loading="lazy"></div>'
            + '<h4>' + r.name + '</h4>'
            + '<p>' + (r.highlight || r.variant || '') + '</p>'
            + '<span>Detaylar →</span>'
            + '</div>';
        }).join('')
      + '</div></div></section>'
    : '';

  var badge = p.badge
    ? '<span class="detail-badge" style="background:' + p.badgeColor + '">' + p.badge + '</span>'
    : '';

  return '<!DOCTYPE html><html lang="tr"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + p.name + ' | ' + site.settings.site_name + '</title>'
    + commonCSS(pc, sc, ac)
    + '<style>'
    + '.detail-hero { margin-top:70px; background:var(--dark); padding:3rem 0; }\n'
    + '.detail-hero-inner { display:grid; grid-template-columns:1fr 1fr; gap:4rem; align-items:center; }\n'
    + '.detail-visual { background:var(--grad); border-radius:24px; height:320px; position:relative; overflow:hidden; }\n'
    + '.detail-visual img { width:100%; height:100%; object-fit:cover; display:block; }\n'
    + '.detail-badge { position:absolute; top:1rem; right:1rem; padding:.4rem 1rem; border-radius:50px; font-size:.8rem; font-weight:700; color:#fff; }\n'
    + '.detail-info { color:#fff; }\n'
    + '.breadcrumb { font-size:.82rem; color:rgba(255,255,255,.5); margin-bottom:1rem; }\n'
    + '.breadcrumb a { color:rgba(255,255,255,.5); } .breadcrumb a:hover { color:var(--ac); }\n'
    + '.detail-cat { font-size:.82rem; font-weight:700; color:var(--ac); text-transform:uppercase; letter-spacing:.06em; margin-bottom:.5rem; }\n'
    + '.detail-name { font-size:2.5rem; font-weight:800; line-height:1.2; margin-bottom:.5rem; }\n'
    + '.detail-tagline { font-size:1.1rem; color:rgba(255,255,255,.7); margin-bottom:1.5rem; }\n'
    + '.detail-price-row { display:flex; align-items:center; gap:1rem; margin-top:1.5rem; }\n'
    + '.detail-price { font-size:1.1rem; font-weight:700; color:var(--ac); }\n'
    + '.btn-contact { display:inline-block; padding:.85rem 2rem; background:var(--grad); color:#fff; border-radius:50px; font-weight:700; font-size:.95rem; transition:.2s; border:none; cursor:pointer; }\n'
    + '.btn-contact:hover { transform:translateY(-2px); box-shadow:0 10px 25px rgba(0,0,0,.25); }\n'
    + '.btn-outline { display:inline-block; padding:.85rem 2rem; background:transparent; color:#fff; border:2px solid rgba(255,255,255,.4); border-radius:50px; font-weight:700; font-size:.95rem; transition:.2s; }\n'
    + '.btn-outline:hover { border-color:#fff; }\n'
    + '.content-section { padding:4rem 0; }\n'
    + '.two-col { display:grid; grid-template-columns:1fr 1fr; gap:3rem; }\n'
    + '.section-label { font-size:.8rem; font-weight:700; color:var(--ac); text-transform:uppercase; letter-spacing:.08em; margin-bottom:1rem; }\n'
    + 'h2.sec-title { font-size:1.6rem; font-weight:800; margin-bottom:1.5rem; color:var(--text); }\n'
    + '.detail-desc { font-size:1rem; color:var(--light); line-height:1.85; }\n'
    + '.features-list { list-style:none; margin-top:.5rem; }\n'
    + '.features-list li { display:flex; align-items:flex-start; gap:.75rem; padding:.6rem 0; border-bottom:1px solid #f0f0f0; font-size:.95rem; color:var(--text); }\n'
    + '.features-list li:last-child { border:none; }\n'
    + '.feat-check { color:var(--ac); font-weight:800; flex-shrink:0; }\n'
    + '.specs-card { background:#fff; border-radius:20px; box-shadow:var(--shadow); padding:2rem; max-height:520px; overflow-y:auto; }\n'
    + '.spec-tab-group { margin-bottom:1.5rem; }\n'
    + '.spec-tab-group:last-child { margin-bottom:0; }\n'
    + '.spec-tab-title { font-size:1rem; font-weight:800; color:var(--pc); margin-bottom:.75rem; }\n'
    + '.spec-block { margin-bottom:1rem; }\n'
    + '.spec-block:last-child { margin-bottom:0; }\n'
    + '.spec-block-title { font-size:.85rem; font-weight:700; color:var(--light); margin-bottom:.4rem; }\n'
    + '.spec-items { list-style:none; }\n'
    + '.spec-items li { font-size:.88rem; color:var(--text); padding:.4rem 0; border-bottom:1px solid #f5f5f5; }\n'
    + '.spec-items li:last-child { border:none; }\n'
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
    + '@media(max-width:768px){'
    + '.detail-hero-inner{grid-template-columns:1fr;gap:2rem;}'
    + '.detail-name{font-size:1.8rem;}'
    + '.two-col{grid-template-columns:1fr;}'
    + '.detail-price-row{flex-wrap:wrap;}'
    + '}\n'
    + '</style>'
    + '</head><body>'
    + navHTML(site)
    + '<div class="detail-hero"><div class="container">'
    + '<div class="detail-hero-inner">'
    + '<div class="detail-visual">'
    + '<img src="' + (p.image || '') + '" alt="' + p.name + '" loading="lazy">'
    + badge
    + '</div>'
    + '<div class="detail-info">'
    + '<p class="breadcrumb"><a href="/">Ana Sayfa</a> / <a href="/urunler">Ürünler</a> / ' + p.name + '</p>'
    + '<p class="detail-cat">' + catLabel + '</p>'
    + '<h1 class="detail-name">' + p.name + '</h1>'
    + '<p class="detail-tagline">' + (p.highlight || p.variant || '') + '</p>'
    + '<div class="detail-price-row">'
    + '<span class="detail-price">' + (p.price || 'Fiyat için iletişime geçin') + '</span>'
    + '<a href="/#contact" class="btn-contact">Teklif Al</a>'
    + '<a href="/urunler" class="btn-outline">← Ürünler</a>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div></div>'
    + '<div class="content-section"><div class="container"><div class="two-col">'
    + '<div>'
    + '<p class="section-label">Ürün Hakkında</p>'
    + '<h2 class="sec-title">Detaylı Açıklama</h2>'
    + '<p class="detail-desc">' + p.shortDesc + '</p>'
    + '<br><h2 class="sec-title">Öne Çıkan Özellikler</h2>'
    + '<ul class="features-list">' + featuresHTML + '</ul>'
    + '</div>'
    + '<div>'
    + '<p class="section-label">Teknik Özellikler</p>'
    + '<div class="specs-card">' + specsHTML + '</div>'
    + '</div>'
    + '</div></div></div>'
    + '<div class="container">'
    + '<div class="cta-band">'
    + '<h3>' + p.name + ' hakkında bilgi almak ister misiniz?</h3>'
    + '<p>Uzman ekibimiz size en uygun çözümü sunmak için hazır.</p>'
    + '<a href="/#contact" class="btn-white">İletişime Geçin</a>'
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
  renderProductList:   renderProductList,
  renderProductDetail: renderProductDetail
};
