/**
 * dashboard-card.js - Componente para cards del dashboard de módulo
 */

var DashboardCard = window.DashboardCard || {};

/**
 * Renderiza una card individual
 * @param {Object} config - Configuración de la card
 */
DashboardCard.render = function (config) {
  const {
    icon,
    title,
    badge = null,
    stats = [],
    details = null,
    actions = [],
    route = null
  } = config;

  // Construir estadísticas
  const statsHtml = stats.map(stat => `
        <div class="stat-item">
            <span class="stat-value">${stat.value}</span>
            <span class="stat-label">${stat.label}</span>
        </div>
    `).join('');

  // Construir acciones
  const actionsHtml = actions.map(action => {
    if (action.route) {
      return `<a href="#${action.route}" class="btn btn-sm ${action.class || 'btn-outline-primary'}">${action.label}</a>`;
    } else if (action.onClick) {
      return `<button class="btn btn-sm ${action.class || 'btn-outline-primary'}" onclick="${action.onClick}">${action.label}</button>`;
    }
    return '';
  }).join('');

  // Construir badge
  const badgeHtml = badge ? `
        <span class="badge ${badge.class || 'bg-primary'} ms-2">${badge.value}</span>
    ` : '';

  // Card completa (si tiene route, es clickeable)
  const cardClass = route ? 'dashboard-card clickable' : 'dashboard-card';

  return `
        <div class="${cardClass}" ${route ? `data-route="${route}"` : ''}>
            <div class="card-header-custom">
                <div class="d-flex align-items-center">
                    <i class="fas ${icon} me-2"></i>
                    <h5 class="mb-0">${title}${badgeHtml}</h5>
                </div>
            </div>
            
            ${stats.length > 0 ? `
                <div class="card-stats">
                    ${statsHtml}
                </div>
            ` : ''}
            
            ${details ? `
                <div class="card-details">
                    ${details}
                </div>
            ` : ''}
            
            ${actions.length > 0 ? `
                <div class="card-actions">
                    ${actionsHtml}
                </div>
            ` : ''}
        </div>
    `;
};

/**
 * Renderiza un layout de dashboard con múltiples cards
 * @param {Object} config - Configuración del dashboard
 */
DashboardCard.renderLayout = function (config) {
  const {
    title,
    subtitle = null,
    cards = [],
    quickActions = []
  } = config;

  // Construir quick actions
  const quickActionsHtml = quickActions.length > 0 ? `
        <div class="quick-actions mb-4">
            ${quickActions.map(action => `
                <button class="btn ${action.class || 'btn-primary'}" 
                        ${action.route ? `data-route="${action.route}"` : ''}
                        ${action.onClick ? `onclick="${action.onClick}"` : ''}>
                    <i class="fas ${action.icon} me-2"></i>${action.label}
                </button>
            `).join('')}
        </div>
    ` : '';

  // Construir grid de cards
  const cardsHtml = `
        <div class="row g-4">
            ${cards.map(card => `
                <div class="col-12 col-md-6 col-lg-4">
                    ${DashboardCard.render(card)}
                </div>
            `).join('')}
        </div>
    `;

  return `
        <div class="module-dashboard">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>${title}</h2>
                    ${subtitle ? `<p class="text-muted">${subtitle}</p>` : ''}
                </div>
            </div>
            
            ${quickActionsHtml}
            ${cardsHtml}
        </div>
    `;
};

window.DashboardCard = DashboardCard;