// ============================================================
// ===== ME TAB (заглушка) ====================================
// ============================================================
export function mount(root) {
  root.innerHTML = `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Я</h1>
          <span class="alfa-badge">Alfa</span>
        </div>
        <div class="avatar">ЭМ</div>
      </div>
      <div class="subtitle">Налоги, цели, настройки</div>
    </div>
    <div class="container">
      <div class="card card-neutral">
        <div class="empty-state">
          <div class="icon">🚧</div>
          <div class="title">Вкладка в разработке</div>
          <div class="desc">Наполним на Шаге 3</div>
        </div>
      </div>
    </div>
  `;
}