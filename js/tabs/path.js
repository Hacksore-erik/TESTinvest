import { state, CONFIG, formatRub, formatPercent, haptic } from '../core.js';
import { generateInsight } from '../services.js';

// ============================================================
// ===== TEMPLATE =============================================
// ============================================================
export function template() {
  return `
    <div class="header">
      <div class="header-top">
        <div class="header-title-wrap">
          <h1>Путь</h1>
          <span class="alfa-badge">DEV</span>
        </div>
        <div class="avatar">ЭМ</div>
      </div>
      <div class="subtitle">Веди себя к цели</div>
    </div>

    <div class="container">
      <div class="card card-hero fade-up">
        <div class="goal-label">Цель</div>
        <div class="goal-amount">
          <div class="num" id="goalAmount">1 000 000</div>
          <div class="currency">₽</div>
        </div>
        <div class="goal-deadline">к 31 декабря 2029</div>
        <div class="goal-progress-track">
          <div class="goal-progress-fill" id="goalProgress" style="width: 0%"></div>
        </div>
        <div class="goal-stats">
          <span>Прогресс <span class="now" id="goalPercent">0%</span></span>
          <span>Сейчас <span class="now" id="goalCurrent">— ₽</span></span>
        </div>
        <div class="goal-meta-row">
          <div class="goal-meta-item">
            <div class="label">Осталось</div>
            <div class="value" id="goalRemaining">— ₽</div>
          </div>
          <div class="goal-meta-item">
            <div class="label">Времени</div>
            <div class="value">3 г. 3 мес.</div>
          </div>
        </div>
      </div>

      <div class="card card-yellow fade-up">
        <div class="section-title yellow">При текущей стратегии</div>
        <div class="row"><span class="lbl">Дойдёшь до</span><span class="val yellow" id="realityReach">— ₽</span></div>
        <div class="row"><span class="lbl">Не хватит</span><span class="val red" id="realityGap">— ₽</span></div>
        <div class="divider"></div>
        <div style="font-size: 13px; color: var(--text-tertiary); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 12px;">Чтобы успеть</div>
        <div class="options">
          <div class="option"><span class="arrow">→</span><span class="text" id="option1">+18% доходности в год</span></div>
          <div class="option"><span class="arrow">→</span><span class="text" id="option2">+4 500 ₽ в месяц</span></div>
          <div class="option"><span class="arrow">→</span><span class="text" id="option3">Продлить срок</span></div>
        </div>
      </div>

      <div class="card card-green fade-up">
        <div class="today-badge"><span class="dot"></span>Сегодня</div>
        <div class="row"><span class="lbl">Отклонение от плана</span><span class="val red" id="todayDeviation">—</span></div>
        <div class="row"><span class="lbl">Стоимость для цели</span><span class="val red" id="todayCost">—</span></div>
      </div>

      <div class="card card-teal fade-up">
        <div class="insight-label"><span>💡</span><span>Инсайт дня</span></div>
        <div class="insight-text" id="insightText">Загрузи токен на вкладке «Портфель», чтобы увидеть персональный инсайт.</div>
      </div>

      <div class="section-header fade-up"><h2>Сценарии</h2></div>

      <div class="scenario active tappable fade-up" data-scenario="base">
        <div class="scenario-head"><div class="scenario-name">Базовый</div><div class="scenario-check">✓</div></div>
        <div class="scenario-desc">Индекс + 5% в год</div>
        <div class="row"><span class="lbl">К сроку</span><span class="val green" id="scenarioBase">— ₽</span></div>
      </div>

      <div class="scenario tappable fade-up" data-scenario="safe">
        <div class="scenario-head"><div class="scenario-name">Осторожный</div><div class="scenario-check">✓</div></div>
        <div class="scenario-desc">ОФЗ + вклады</div>
        <div class="row"><span class="lbl">К сроку</span><span class="val yellow" id="scenarioSafe">— ₽</span></div>
      </div>

      <div class="scenario tappable fade-up" data-scenario="aggressive">
        <div class="scenario-head"><div class="scenario-name">Агрессивный</div><div class="scenario-check">✓</div></div>
        <div class="scenario-desc">Дивидендные акции + фонды</div>
        <div class="row"><span class="lbl">К сроку</span><span class="val green" id="scenarioAggressive">— ₽</span></div>
        <div class="row"><span class="lbl">Риск просадки</span><span class="val red">до −35% в год</span></div>
      </div>
    </div>
  `;
}

// ============================================================
// ===== MOUNT ================================================
// ============================================================
export function mount(root) {
  root.innerHTML = template();

  root.querySelectorAll('.scenario').forEach(el => {
    el.addEventListener('click', () => {
      root.querySelectorAll('.scenario').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      haptic();
    });
  });

  render(root);
}

// ============================================================
// ===== RENDER ===============================================
// ============================================================
export function render(root) {
  const current = state.totalValue || 0;
  const percent = Math.min((current / CONFIG.GOAL) * 100, 100);

  root.querySelector('#goalProgress').style.width = percent + '%';
  root.querySelector('#goalPercent').textContent = percent.toFixed(1) + '%';
  root.querySelector('#goalCurrent').textContent = formatRub(current);
  root.querySelector('#goalRemaining').textContent = formatRub(Math.max(CONFIG.GOAL - current, 0));

  const projected = current * Math.pow(1.05, CONFIG.YEARS_LEFT);
  root.querySelector('#realityReach').textContent = formatRub(projected);
  root.querySelector('#realityGap').textContent = formatRub(Math.max(CONFIG.GOAL - projected, 0));

  root.querySelector('#scenarioBase').textContent = formatRub(current * Math.pow(1.05, CONFIG.YEARS_LEFT));
  root.querySelector('#scenarioSafe').textContent = formatRub(current * Math.pow(1.08, CONFIG.YEARS_LEFT));
  root.querySelector('#scenarioAggressive').textContent = formatRub(current * Math.pow(1.12, CONFIG.YEARS_LEFT));

  const gap = Math.max(CONFIG.GOAL - projected, 0);
  const monthlyNeeded = gap / (CONFIG.YEARS_LEFT * 12);
  const yieldNeeded = current > 0
    ? (Math.pow(CONFIG.GOAL / current, 1 / CONFIG.YEARS_LEFT) - 1) * 100
    : 0;

  if (gap > 0 && current > 0) {
    root.querySelector('#option1').textContent = `+${yieldNeeded.toFixed(0)}% доходности в год`;
    root.querySelector('#option2').textContent = `+${formatRub(monthlyNeeded)} в месяц`;
    root.querySelector('#option3').textContent = `Продлить срок на ${Math.ceil(gap / (current * 0.05))} мес.`;
  } else if (current > 0) {
    root.querySelector('#option1').textContent = 'Ты идёшь с опережением графика';
    root.querySelector('#option2').textContent = 'Продолжай в том же темпе';
    root.querySelector('#option3').textContent = 'Можешь увеличить цель';
  }

  const plannedProgress = (1 / (CONFIG.YEARS_LEFT + 3.25)) * 100;
  const deviation = percent - plannedProgress;
  root.querySelector('#todayDeviation').textContent = formatPercent(deviation);
  root.querySelector('#todayCost').textContent = formatRub(Math.abs(deviation) / 100 * CONFIG.GOAL);

  root.querySelector('#insightText').innerHTML = generateInsight(state.operations);
}