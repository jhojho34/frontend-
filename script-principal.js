// Conteúdo do script.js
// Dados das promoções (em um cenário real, viriam de um arquivo JSON)
// let promocoes = JSON.parse(localStorage.getItem("promocoes")) || [];
let promocoes = [];
let cuponsPainel = [];
let cuponsAtivosParaSelecao = [];

// Variável global para armazenar cupons ativos no frontend (usada aqui)
let cuponsAtivosMap = new Map();

// Função para calcular o desconto percentual
function calcularDesconto(precoAntigo, precoNovo) {
    const precoAntigoValido = typeof precoAntigo === 'number' && precoAntigo > 0;
    
    if (!precoAntigoValido || precoAntigo <= precoNovo) {
        if (precoNovo > 0) {
            return 0; // Retorna 0 para ser exibido como 0%
        }
        return null; // Retorna null se não houver base para cálculo
    }
    return Math.round(((precoAntigo - precoNovo) / precoAntigo) * 100);
}

// =======================================================
// FUNÇÃO CENTRALIZADA PARA EXIBIR NOTIFICAÇÕES (TOAST/MODAL)
// =======================================================

/**
 * Exibe uma notificação estilizada no topo da tela.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} type O tipo de alerta (success, error, warning).
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');

    // Se o container não existir, crie-o no body.
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1050';
        document.body.appendChild(container);
    }

    // Mapeia o tipo para as classes Bootstrap
    let alertClass;
    let iconClass;

    switch (type) {
        case 'success':
            alertClass = 'alert-success';
            iconClass = 'bi-check-circle-fill';
            break;
        case 'error':
            alertClass = 'alert-danger';
            iconClass = 'bi-x-octagon-fill';
            break;
        case 'warning':
            alertClass = 'alert-warning';
            iconClass = 'bi-exclamation-triangle-fill';
            break;
        case 'info':
        default:
            alertClass = 'alert-info';
            iconClass = 'bi-info-circle-fill';
            break;
    }

    const toast = document.createElement('div');
    toast.className = `alert ${alertClass} alert-dismissible fade show custom-toast`;
    toast.role = 'alert';
    toast.innerHTML = `
        <i class="bi ${iconClass} me-2"></i>
        <span>${message}</span>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Anexa e exibe
    document.getElementById('toast-container').appendChild(toast);

    // Remove após 5 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide'); // Para dar um fade out suave
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}
// Exporta para uso em onclick/eventos
window.showToast = showToast;

// =======================================================
// TERMINO DA FUNÇÃO CENTRALIZADA PARA EXIBIR NOTIFICAÇÕES (TOAST/MODAL)
// =======================================================


// Função para formatar preço em Real
function formatarPreco(preco) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(preco);
}

async function carregarPromocoes(promocoesParaExibir = null, isFiltered = false) {
    const container = document.getElementById('promocoes-container');

    if (!container) {
        return;
    }

    container.innerHTML = 'Carregando ofertas...'; 

    // --- PASSO 1: Busca e Processa Promoções e Cupons ---
    if (promocoesParaExibir === null) {
        try {
            // A. Busca Promoções
            const promocoesResponse = await fetch('/api/promocoes');
            if (!promocoesResponse.ok) {
                throw new Error('Falha ao carregar promoções da API.');
            }
            promocoes = await promocoesResponse.json();
            promocoesParaExibir = promocoes;

            // B. Busca Cupons Ativos e Cria o Mapa (Lookup Table)
            const cuponsResponse = await fetch('/api/cupons'); // Rota pública
            if (cuponsResponse.ok) {
                const cuponsAtivos = await cuponsResponse.json();
                cuponsAtivosMap = new Map(cuponsAtivos.map(cupom => [cupom._id, cupom]));
            } else {
                 console.warn("Aviso: Falha ao carregar a lista de cupons ativos para o index.");
            }

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            container.innerHTML = '<div class="alert alert-danger" role="alert">Não foi possível carregar as promoções. Verifique o servidor.</div>';
            return;
        }
    }

    container.innerHTML = ''; 

    // LÓGICA DE CHECAGEM DE RESULTADOS
    if (promocoesParaExibir.length === 0) {
        if (isFiltered) {
            container.innerHTML = `
                <div class="col-12 text-center my-5">
                    <i class="bi bi-search" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="text-muted mt-3">**Não encontramos nenhuma promoção com os filtros aplicados.**</p>
                    <button class="btn btn-outline-secondary mt-2" onclick="limparFiltros()">Limpar Filtros</button>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-center text-muted">Nenhuma promoção encontrada no momento.</p>';
        }
        return;
    }

    // --- PASSO 2: Lógica de Renderização com Cupons e Descrição ---
    promocoesParaExibir.forEach(promocao => {
        // Calcula o desconto (será 0 se o preço antigo for 0 ou null, e null se não tiver base)
        const desconto = calcularDesconto(promocao.precoAntigo, promocao.precoNovo);

        // 🎯 AJUSTE 1: Define o badge de desconto (só se o desconto for diferente de null)
        const discountBadgeHtml = desconto !== null 
            ? `<span class="discount-badge">-${desconto}%</span>` 
            : '';

        // Renderização dos Cupons Relacionados
        let cuponsHtml = '';
        const cuponsRelacionadosIds = promocao.cuponsRelacionados || [];
        
        const cuponsAtivosRelacionados = cuponsRelacionadosIds
            .map(cupomId => cuponsAtivosMap.get(cupomId)) 
            .filter(cupom => cupom); 

        if (cuponsAtivosRelacionados.length > 0) {
             // Se houver cupons ativos, renderiza os botões clicáveis
             cuponsHtml += '<div class="coupon-badges mt-2">';
             cuponsAtivosRelacionados.forEach(cupom => {
                 cuponsHtml += `
                     <button type="button" class="btn btn-sm btn-coupon me-1 mb-1" 
                             title="${cupom.descricao}"
                             onclick="copiarCupom('${cupom.codigo}', '${cupom.link}')">
                         <i class="bi bi-ticket"></i> ${cupom.codigo}
                     </button>
                 `;
             });
             cuponsHtml += '</div>';
        } else {
             // Renderiza o badge "Nenhum Cupom"
             cuponsHtml = `
                <div class="coupon-badges mt-2">
                    <span class="btn btn-sm btn-coupon-disabled me-1 mb-1" 
                          title="Nenhum cupom disponível para este produto">
                        <i class="bi bi-ticket-slash"></i> Nenhum Cupom
                    </span>
                </div>
             `;
        }
        
        // 🎯 AJUSTE 2: Define o HTML do Preço Antigo (só mostra se o desconto for diferente de null)
        // Se desconto for 0, oldPriceHtml é renderizado com o valor de R$ 0,00 riscado.
        const oldPriceHtml = desconto !== null 
            ? `<span class="old-price me-2">${formatarPreco(promocao.precoAntigo || 0)}</span>`
            : '';
        
        // Criação do Card HTML
        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6';
        card.innerHTML = `
            <div class="card card-promo">
                <div class="position-relative">
                    <img src="${promocao.imagem}" class="card-img-top" alt="${promocao.titulo}">
                    
                    ${discountBadgeHtml} </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${promocao.titulo}</h5>
                    
                    <p class="card-text description-text text-muted small mb-2">${promocao.descricao || ''}</p> 

                    ${cuponsHtml}
                    
                    <div class="mt-auto">
                        <div class="d-flex align-items-center mb-2 mt-2">
                            ${oldPriceHtml} <span class="new-price">${formatarPreco(promocao.precoNovo)}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="store-badge">${promocao.loja}</span>
                            <a href="${promocao.link}" class="btn btn-primary btn-sm" target="_blank">
                                Ver Promoção
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Função para filtrar promoções (Sem alterações, mas incluída para contexto)
// Função para filtrar promoções (com busca por texto)
function filtrarPromocoes() {
    // 1. CAPTURA DOS VALORES
    // Novo: Pega o valor do campo de busca por texto
    const textoBusca = document.getElementById('busca-texto').value.toLowerCase();

    // Antigos: Campos de filtro já existentes
    const categoria = document.getElementById('categoria').value;
    const loja = document.getElementById('loja').value;
    const precoMin = parseFloat(document.getElementById('preco-min').value) || 0;
    const precoMax = parseFloat(document.getElementById('preco-max').value) || Infinity;

    const promocoesFiltradas = promocoes.filter(promocao => {
        // 2. LÓGICA DO FILTRO

        // NOVO: Verifica se o título da promoção contém o texto de busca
        const atendeTexto = promocao.titulo.toLowerCase().includes(textoBusca);
        // Você pode adicionar mais campos se quiser buscar na descrição, loja, etc.

        const atendeCategoria = categoria === 'todas' || promocao.categoria === categoria;
        const atendeLoja = loja === 'todas' || promocao.loja.toLowerCase() === loja;
        const atendePreco = promocao.precoNovo >= precoMin && promocao.precoNovo <= precoMax;

        // O produto só aparece se atender *todos* os critérios, incluindo o texto de busca.
        return atendeTexto && atendeCategoria && atendeLoja && atendePreco;
    });

    // Recarrega as promoções, indicando que é um filtro (true)
    carregarPromocoes(promocoesFiltradas, true);
}

// Função para limpar filtros
// ATENÇÃO: A função limparFiltros precisa ser atualizada para aceitar o argumento 'recarregar'
function limparFiltros(recarregar = true) {
    // Limpa o campo de busca por texto (assumindo id="busca-texto")
    const buscaTexto = document.getElementById('busca-texto');
    if (buscaTexto) buscaTexto.value = '';

    // Limpa os outros filtros
    document.getElementById('categoria').value = 'todas';
    document.getElementById('loja').value = 'todas';
    document.getElementById('preco-min').value = '';
    document.getElementById('preco-max').value = '';

    // Só recarrega se for uma chamada do botão 'Limpar'
    if (recarregar) {
        carregarPromocoes(null, false);
    }
}

// NOVO: Função para aplicar o filtro ao clicar no card
function aplicarFiltroRapido(categoriaSelecionada) {
    // 1. Limpa outros filtros (texto, loja, preço) sem recarregar a página
    limparFiltros(false);

    // 2. Define o valor da categoria no campo de filtro principal
    const selectCategoria = document.getElementById('categoria');
    if (selectCategoria) {
        selectCategoria.value = categoriaSelecionada;
    }

    // 3. Executa a filtragem
    filtrarPromocoes();

    // Opcional: Rola a página para a seção de resultados para dar feedback imediato
    const container = document.getElementById('promocoes-container');
    if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
    }
}

// Event Listeners (script.js)
document.addEventListener('DOMContentLoaded', function () {

    // 1. VERIFICAÇÃO PRINCIPAL: Checa se estamos na página inicial (index.html)
    const promocoesContainer = document.getElementById('promocoes-container');
    const cuponsContainer = document.getElementById('cupons-container');

    if (promocoesContainer) {

        // A. Carregar promoções iniciais (correto, só roda se o container existir)
        carregarPromocoes();

        if (cuponsContainer) {
            carregarCuponsNoIndex(); // <<< ADICIONE ESTA LINHA
        }

        // B. Elementos de Filtro e seus Listeners
        const aplicarFiltrosBtn = document.getElementById('aplicar-filtros');
        const limparFiltrosBtn = document.getElementById('limpar-filtros');

        if (aplicarFiltrosBtn) {
            aplicarFiltrosBtn.addEventListener('click', filtrarPromocoes);
        }
        if (limparFiltrosBtn) {
            limparFiltrosBtn.addEventListener('click', limparFiltros);
        }

        // C. Adicionar animação suave ao rolar para as seções (Âncoras)
        // const anchorLinks = document.querySelectorAll('a[href^="#"]');

        // Utilizamos o for...of para iteração robusta
        // for (const anchor of anchorLinks) {

        // 🚨 SOLUÇÃO DE FORÇA BRUTA: Se, por algum motivo, o elemento for null, ignoramos.
        //    if (!anchor || typeof anchor.addEventListener !== 'function') {
        //        continue; 
        //    }

        // A Linha 296 deve cair aqui agora:
        //    anchor.addEventListener('click', function (e) {
        //        e.preventDefault();

        // Note que o `this` é sempre o `anchor` aqui. 
        //        const target = document.querySelector(this.getAttribute('href'));

        // Garante que o alvo existe antes de tentar a rolagem
        //        if (target) {
        //            target.scrollIntoView({
        //                behavior: 'smooth',
        //                block: 'start'
        //            });
        //        }
        //    });
        // }
    }

    // NOTA: A inicialização do Painel do Administrador (inicializarPainel) 
    // está corretamente isolada em outro bloco logo abaixo, usando:
    // if (document.title.includes('Painel do Administrador')) { inicializarPainel(); }
});

// Conteúdo do script-painel.js
// Dados iniciais (em um sistema real, viriam de uma API/banco de dados)
// let promocoesPainel = JSON.parse(localStorage.getItem('promocoes')) || [];
// Variáveis globais para armazenar as instâncias do Chart.js
let clicksChartInstance = null;
let clicksEvolutionChartInstance = null;
let promocoesPainel = [];
let cliques = JSON.parse(localStorage.getItem('cliques')) || {};
let adminData = JSON.parse(localStorage.getItem('adminData')) || {
    nome: 'Administrador',
    email: 'admin@promoshop.com',
    senha: 'admin123'
};

// ... (Dentro da seção: Conteúdo do script-painel.js)

// Inicialização
// document.addEventListener('DOMContentLoaded', function () {
// Adicione a verificação de token para segurança inicial
//     if (!getToken()) {
//         alert('Você precisa estar logado para acessar o painel.');
//         window.location.href = 'loginadm.html';
//         return;
//     }

//     const formConfig = document.getElementById('form-config-admin');
//     formConfig.addEventListener('submit', salvarConfiguracoesAdmin);

//     carregarDadosAdmin();
//     inicializarNavegacao();
//     inicializarFormularios();

// Agora, carrega a lista e, SÓ DEPOIS, atualiza o Dashboard/Cliques
//     carregarPromocoesNaTabela(); 

// A função carregarCliquesNaTabela será chamada dentro de carregarPromocoesNaTabela()
// });

// Navegação entre abas
function inicializarNavegacao() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {

            // Verifica se o link tem o atributo data-section para navegação interna
            if (!this.getAttribute('data-section')) {
                return; // Sai da função, permitindo que links sem data-section (como o de Sair) executem sua ação padrão (ou o onclick)
            }

            e.preventDefault(); // Impede navegação padrão, só se for uma seção interna

            // Remove a classe active de todos os links
            navLinks.forEach(l => l.classList.remove('active'));

            // Adiciona a classe active ao link clicado
            this.classList.add('active');

            // Oculta todas as seções
            contentSections.forEach(section => section.classList.remove('active'));

            // Mostra a seção correspondente
            const targetSection = this.getAttribute('data-section');
            document.getElementById(targetSection).classList.add('active');

            // Atualiza o título da página
            pageTitle.textContent = this.querySelector('span').textContent;
        });
    });
}

// Função para lidar com o logout
function fazerLogout(e) {
    // 1. Limpa o token de autenticação (ESSENCIAL para deslogar)
    localStorage.removeItem('authToken');

    // 2. Redireciona para a página de login ou a página inicial
    window.location.href = 'loginadm.html';

    // NOTA: Não precisa de e.preventDefault() aqui, mas é uma boa prática
    // para o caso de ter sido chamado via onclick com href="#".
    if (e) {
        e.preventDefault();
    }
}

// Exportar a função globalmente para que o HTML possa chamá-la
window.fazerLogout = fazerLogout;

// Dashboard - Estatísticas e Gráficos
function inicializarDashboard() {
    // Esta função será chamada após o carregamento da API
    atualizarEstatisticas();
    inicializarGraficoCliques(); // Pode ser chamado a qualquer momento, pois usa dados fictícios
    carregarTopProdutos();
}

function atualizarEstatisticas() {
    // Total de produtos
    document.getElementById('total-produtos').textContent = promocoesPainel.length;

    // Total de cliques
    // Calcula a soma de todos os valores 'total' no objeto global 'cliques'
    const totalCliques = Object.values(cliques).reduce((acc, curr) => acc + curr.total, 0);
    document.getElementById('total-cliques').textContent = totalCliques;

    // Promoções ativas (consideramos todas como ativas neste exemplo)
    document.getElementById('promocoes-ativas').textContent = promocoesPainel.length;

    // Produto mais clicado
    let produtoMaisClicado = '-';
    let maxCliques = 0;

    promocoesPainel.forEach(promocao => {
        // 🚨 AJUSTE PRINCIPAL: Busca os cliques usando promocao._id
        const cliquesProduto = cliques[promocao._id] ? cliques[promocao._id].total : 0;

        if (cliquesProduto > maxCliques) {
            maxCliques = cliquesProduto;
            // 🚨 AJUSTE PRINCIPAL: Usa promocao.titulo para o nome do produto
            produtoMaisClicado = promocao.titulo;
        }
    });

    // Exibe o produto mais clicado
    document.getElementById('produto-mais-clicado').textContent =
        maxCliques > 0 ? produtoMaisClicado : '-';
}

function inicializarGraficoCliques() {
    const ctx = document.getElementById('clicksChart').getContext('2d');
    const ctx2 = document.getElementById('clicksEvolutionChart').getContext('2d');

    // SOLUÇÃO 1: Destruir instâncias antigas
    if (clicksChartInstance) {
        clicksChartInstance.destroy();
    }
    if (clicksEvolutionChartInstance) {
        clicksEvolutionChartInstance.destroy();
    }
    // FIM DA SOLUÇÃO 1

    // Dados de exemplo para os últimos 7 dias
    const labels = [];
    const data = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('pt-BR'));
        data.push(Math.floor(Math.random() * 50) + 10);
    }

    // SOLUÇÃO 2: Armazenar a nova instância
    clicksChartInstance = new Chart(ctx, { // <<< ARMAZENA NA GLOBAL
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cliques por Dia',
                data: data,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Gráfico de evolução de cliques
    const labels2 = [];
    const data2 = [];

    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels2.push(date.getDate() + '/' + (date.getMonth() + 1));
        data2.push(Math.floor(Math.random() * 100) + 20);
    }

    // SOLUÇÃO 2: Armazenar a nova instância de evolução
    clicksEvolutionChartInstance = new Chart(ctx2, { // <<< ARMAZENA NA GLOBAL
        type: 'bar',
        data: {
            labels: labels2,
            datasets: [{
                label: 'Cliques (Últimos 30 dias)',
                data: data2,
                backgroundColor: 'rgba(13, 110, 253, 0.7)',
                borderColor: '#0d6efd',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function carregarTopProdutos() {
    const container = document.getElementById('top-products-list');

    // Ordenar produtos por cliques
    const produtosComCliques = promocoesPainel.map(promocao => {
        return {
            ...promocao,
            cliques: cliques[promocao.id] ? cliques[promocao.id].total : 0
        };
    }).sort((a, b) => b.cliques - a.cliques).slice(0, 5);

    if (produtosComCliques.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum produto com cliques registrados.</p>';
        return;
    }

    let html = '';
    produtosComCliques.forEach((produto, index) => {
        html += `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                <div>
                    <h6 class="mb-0">${index + 1}. ${produto.nome}</h6>
                    <small class="text-muted">${produto.cliques} cliques</small>
                </div>
                <span class="badge bg-primary">${produto.loja}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Formulários
function inicializarFormularios() {
    // Formulário de cadastro de promoção
    const formCadastro = document.getElementById('form-cadastro-promocao');
    formCadastro.addEventListener('submit', function (e) {
        e.preventDefault();
        cadastrarPromocao();
    });
    // Botão limpar formulário (USAR NOVA FUNÇÃO DE LIMPEZA)
    document.getElementById('btn-limpar-form').addEventListener('click', function () {
        // formCadastro.reset();  <-- REMOVER
        limparFormularioCadastro(); // <--- NOVO
    });

    // Formulário de configurações do admin
    const formConfig = document.getElementById('form-config-admin');
    formConfig.addEventListener('submit', function (e) {
        e.preventDefault();
        salvarConfiguracoesAdmin();
    });

    // NOVO: Formulário de cadastro de novo admin
    const formCadastroNovoAdmin = document.getElementById('form-cadastro-admin-novo');
    if (formCadastroNovoAdmin) {
        formCadastroNovoAdmin.addEventListener('submit', cadastrarNovoAdmin);
    }

    const formCadastroCupom = document.getElementById('form-cadastro-cupom');
    if (formCadastroCupom) {
        formCadastroCupom.addEventListener('submit', cadastrarCupom);
    }

}

// ... (Dentro do Conteúdo do script-painel.js) ...

// Função auxiliar para obter o Token JWT
function getToken() {
    return localStorage.getItem('authToken');
}

function limparFormularioCadastro() {
    document.getElementById('form-cadastro-promocao').reset();
    document.getElementById('produto-id-hidden').value = '';
    // Garante que o campo id-hidden seja limpo:
    const idHidden = document.getElementById('produto-id-hidden');
    if (idHidden) idHidden.value = '';
}

// NOVO: Função de inicialização exclusiva para o PAINEL
function inicializarPainel() {
    const token = getToken();

    // 🚨 BLOQUEIO DE SEGURANÇA ISOLADO
    if (!token) {
        showToast('Você precisa estar logado para acessar o painel.', 'error');
        window.location.href = 'loginadm.html';
        return;
    }

    // O código abaixo só será executado se o token existir
    // Anexa o listener de Configurações AQUI, dentro da segurança:
    const formConfig = document.getElementById('form-config-admin');
    formConfig.addEventListener('submit', salvarConfiguracoesAdmin);

    carregarDadosAdmin();
    inicializarNavegacao();
    inicializarDashboard();
    inicializarFormularios(); // Inicia os listeners dos outros formulários
    carregarPromocoesNaTabela();
    carregarCliquesNaTabela();
    carregarAdministradoresNaTabela();
    carregarCuponsNaTabela();
    carregarCuponsParaSelecao();
}


// Inicialização Global Corrigida
document.addEventListener('DOMContentLoaded', function () {
    // 🚨 AQUI ESTÁ A CORREÇÃO: SÓ CHAMA A INICIALIZAÇÃO SE A PÁGINA FOR O PAINEL
    if (document.title.includes('Painel do Administrador')) {
        inicializarPainel();
    }
    // NOTA: Outras páginas (como o loginadm.html) rodarão apenas o restante do script (login, contato, etc.)

    // ... (Inicialização do script-senha.js, script-admin.js, e script de contato) ...
});

async function cadastrarPromocao() {
    // Verifica se estamos em modo de edição ou cadastro
    const idEdicao = document.getElementById('produto-id-hidden').value;
    const metodoHttp = idEdicao ? 'PUT' : 'POST';
    const urlApi = idEdicao ? `/api/promocoes/${idEdicao}` : '/api/promocoes';

    // 1. Coleta dos dados
    const nome = document.getElementById('produto-nome').value;
    const categoria = document.getElementById('produto-categoria').value;
    const descricao = document.getElementById('produto-descricao').value;
    const precoAntigo = parseFloat(document.getElementById('produto-preco-antigo').value);
    const precoAtual = parseFloat(document.getElementById('produto-preco-atual').value);
    const loja = document.getElementById('produto-loja').value;
    const imagem = document.getElementById('produto-imagem').value || 'https://via.placeholder.com/300x200/6c757d/ffffff?text=Produto+Sem+Imagem';
    const link = document.getElementById('produto-link').value;
    
    // 🎯 AJUSTE CRÍTICO AQUI: Captura o valor único do SELECT
    const cupomSelecionadoId = document.getElementById('cupons-relacionados').value;
    
    // Converte o valor único em um Array:
    // Se o ID for válido e não vazio, cria um array com esse ID. Se for vazio (''), cria um array vazio [].
    const cuponsRelacionados = cupomSelecionadoId ? [cupomSelecionadoId] : [];


    const token = getToken();
    if (!token) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        window.location.href = 'loginadm.html';
        return;
    }

    const dadosPromocao = {
        titulo: nome,
        categoria,
        descricao,
        precoAntigo,
        precoNovo: precoAtual,
        loja,
        imagem,
        link,
        // Envia o Array corretamente formatado
        cuponsRelacionados: cuponsRelacionados 
    };

    try {
        const response = await fetch(urlApi, {
            method: metodoHttp,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosPromocao)
        });

        if (response.status === 401) {
            showToast('Não autorizado. Redirecionando para login.', 'error');
            window.location.href = 'loginadm.html';
            return;
        }

        // NOVO: Tratamento de erro 404 para edição
        if (metodoHttp === 'PUT' && response.status === 404) {
             throw new Error('A promoção não foi encontrada no servidor. A edição falhou.');
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro desconhecido ao salvar.');
        }

        // 2. Ação de sucesso
        const acao = idEdicao ? 'atualizada' : 'cadastrada';

        // Limpar o formulário e o ID oculto
        limparFormularioCadastro();

        // Recarrega a tabela do painel
        await carregarPromocoesNaTabela();
        atualizarEstatisticas();

        // Recarrega a lista da página inicial
        if (typeof carregarPromocoes === 'function') {
            carregarPromocoes();
        }

        showToast(`Promoção ${acao} com sucesso!`);

    } catch (error) {
        console.error(`Erro na operação (${metodoHttp}):`, error);
        showToast(`Erro ao salvar promoção: ${error.message}`);
    }
}

async function carregarPromocoesNaTabela() {
    const tbody = document.getElementById('tabela-promocoes');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Carregando promoções...</td></tr>`;

    const token = getToken();

    // Checagem redundante de token (embora já feita no DOMContentLoaded)
    if (!token) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Erro: Administrador não autenticado.</td></tr>`;
        return;
    }

    try {
        const response = await fetch('/api/promocoes', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Envia o token JWT
            }
        });

        if (response.status === 401) {
            // Se o token expirou ou é inválido
            showToast('Sessão expirada. Faça login novamente.', 'error');
            window.location.href = 'loginadm.html';
            return;
        }

        if (!response.ok) {
            throw new Error('Falha ao carregar a lista de promoções.');
        }

        // 1. Atualiza a variável global do painel com os dados do banco
        promocoesPainel = await response.json();

        // 2. Atualiza o Dashboard e Cliques (AGORA OS DADOS ESTÃO PRONTOS!)
        inicializarDashboard();
        carregarCliquesNaTabela(); // Atualiza a tabela de cliques usando a nova lista de promoções

        if (promocoesPainel.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        Nenhuma promoção cadastrada. <a href="#" data-section="cadastrar-promocao" class="nav-link-inline">Cadastre a primeira promoção</a>.
                    </td>
                </tr>
            `;
            return;
        }

        // 3. Renderiza a Tabela
        let html = '';
        promocoesPainel.forEach(promocao => {
            // Usa '_id' do MongoDB para ações
            const idPromocao = promocao._id;
            // A lógica de cliques ainda depende do objeto 'cliques' local.
            const cliquesProduto = cliques[idPromocao] ? cliques[idPromocao].total : 0;

            html += `
            <tr>
                <td>${promocao.titulo}</td>
                <td><span class="badge bg-secondary">${promocao.categoria}</span></td>
                <td>R$ ${promocao.precoNovo.toFixed(2)}</td>
                <td>${promocao.loja}</td>
                <td>${cliquesProduto}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary action-btn" onclick="editarPromocao('${idPromocao}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success action-btn" onclick="copiarLink('${promocao.link}')">
                        <i class="bi bi-clipboard"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger action-btn" onclick="excluirPromocao('${idPromocao}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar promoções:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Erro de conexão: ${error.message}</td></tr>`;
    }
}

function carregarCliquesNaTabela() {
    const tbody = document.getElementById('tabela-cliques');

    if (promocoesPainel.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Nenhum clique registrado.</td></tr>';
        return;
    }

    let html = '';
    promocoesPainel.forEach(promocao => {
        // 🚨 CORREÇÃO 1: Usar promocao._id para buscar os dados de cliques
        const infoCliques = cliques[promocao._id] || { total: 0, ultimoClique: null };
        const ultimoClique = infoCliques.ultimoClique
            ? new Date(infoCliques.ultimoClique).toLocaleString('pt-BR')
            : 'Nunca';

        html +=
            `<tr>
                <td>${promocao.titulo}</td>` // 🚨 CORREÇÃO 2: Usar promocao.titulo para o nome
            +
            // ... restante do HTML
            `
                <td class="text-truncate" style="max-width: 200px;">${promocao.link}</td>
                <td>${infoCliques.total}</td>
                <td>${ultimoClique}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

async function editarPromocao(id) {
    const promocao = promocoesPainel.find(p => p._id === id); // Busca na lista já carregada da API

    if (!promocao) {
        showToast('Promoção não encontrada na lista atual.', 'error');
        return;
    }

    // 1. Pré-carrega a lista de cupons no dropdown (necessário antes de selecionar)
    await carregarCuponsParaSelecao(promocao._id);
    
    // 2. Configurar o ID Oculto para o PUT (Edição)
    document.getElementById('produto-id-hidden').value = id;

    // 3. Preencher formulário com dados da promoção
    document.getElementById('produto-nome').value = promocao.titulo;
    document.getElementById('produto-categoria').value = promocao.categoria;
    document.getElementById('produto-descricao').value = promocao.descricao || '';
    document.getElementById('produto-preco-antigo').value = promocao.precoAntigo;
    document.getElementById('produto-preco-atual').value = promocao.precoNovo;
    document.getElementById('produto-loja').value = promocao.loja;
    document.getElementById('produto-imagem').value = promocao.imagem || '';
    document.getElementById('produto-link').value = promocao.link;

    // 4. 🎯 Lógica para Selecionar o ÚNICO Cupom Relacionado (Seleção Única)
    const cuponsSelect = document.getElementById('cupons-relacionados');
    if (cuponsSelect) {
        // Deseleciona o valor atual (caso haja)
        cuponsSelect.value = ""; 

        // Se houver cupons relacionados salvos, seleciona o primeiro (e único)
        if (promocao.cuponsRelacionados && promocao.cuponsRelacionados.length > 0) {
            const primeiroCupomId = promocao.cuponsRelacionados[0];
            // Define o valor do select (que é o ID do cupom)
            cuponsSelect.value = primeiroCupomId; 
        }
    }

    // 5. Navegar para a aba de cadastro
    document.querySelector('[data-section="cadastrar-promocao"]').click();

    showToast('Promoção carregada para edição. Faça as alterações necessárias e clique em "Salvar Promoção".', 'info');
}

function copiarLink(link) { // <-- AGORA RECEBE O LINK, NÃO O ID
    // Remove a busca por ID, pois o link já foi fornecido.
    // const promocao = promocoesPainel.find(p => p.id === id); 
    // if (!promocao) return; // Não é mais necessário

    // Usa o link recebido como argumento
    navigator.clipboard.writeText(link)
        .then(() => {
            // Certifique-se que showToast está definida!
            showToast('Link copiado para a área de transferência!');
        })
        .catch(err => {
            console.error('Erro ao copiar link: ', err);
            // Usando um alerta de fallback, caso showToast falhe ou seja redundante
            showToast('Erro ao copiar link. Tente novamente.', 'error');
        });
}

async function excluirPromocao(id) {
    // 1. Substitui o window.confirm() pelo SweetAlert2 assíncrono
    const result = await Swal.fire({
        title: 'Tem Certeza?',
        text: 'Você não poderá reverter esta exclusão! Esta ação é irreversível.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Vermelho para a exclusão
        cancelButtonColor: '#3085d6', // Azul para o cancelamento
        confirmButtonText: 'Sim, Excluir!',
        cancelButtonText: 'Cancelar'
    });

    // Se o usuário clicar em "Cancelar" ou fechar o alerta, a função termina.
    if (!result.isConfirmed) {
        return;
    }

    // A partir daqui, a lógica de exclusão prossegue, pois o usuário confirmou.
    const token = getToken();
    if (!token) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        window.location.href = 'loginadm.html';
        return;
    }

    try {
        const response = await fetch(`/api/promocoes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            showToast('Não autorizado. Redirecionando para login.', 'error');
            window.location.href = 'loginadm.html';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir promoção.');
        }

        // Recarrega a lista e as estatísticas
        await carregarPromocoesNaTabela();
        atualizarEstatisticas(); // Re-executa estatísticas

        // 2. Alerta de Sucesso Estilizado do SweetAlert2
        Swal.fire(
            'Excluído!',
            'A promoção foi removida com sucesso.',
            'success'
        );

    } catch (error) {
        console.error('Erro ao excluir:', error);
        // 3. Usa o showToast para o erro da API/conexão
        showToast(`Falha ao excluir promoção: ${error.message}`, 'error');
    }
}

// Adicionar ao bloco do painel no script-principal.js
async function salvarConfiguracoesAdmin(event) {
    if (event) { // 🚨 ADICIONE ESTA VERIFICAÇÃO
        event.preventDefault(); // Linha 1070 (agora segura)
    }

    const nome = document.getElementById('admin-nome').value;
    const email = document.getElementById('admin-email').value;
    const senhaAtual = document.getElementById('admin-senha-atual').value;
    const senhaNova = document.getElementById('admin-senha-nova').value;
    const senhaConfirmar = document.getElementById('admin-senha-confirmar').value;

    const alertPlaceholder = document.getElementById('config-alert-placeholder');
    // Função auxiliar para mostrar alertas no painel
    const showToast = (msg, tipo) => {
        alertPlaceholder.innerHTML = `<div class="alert alert-${tipo}" role="alert">${msg}</div>`;
        alertPlaceholder.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    alertPlaceholder.innerHTML = ''; // Limpa alertas anteriores

    // 1. Validação de Nova Senha no Front-end
    if (senhaNova && senhaNova.length < 6) {
        showToast('A nova senha deve ter pelo menos 6 caracteres.', 'danger');
        return;
    }
    if (senhaNova && senhaNova !== senhaConfirmar) {
        showToast('A nova senha e a confirmação não coincidem.', 'danger');
        return;
    }

    // 2. Requerimento de Senha Atual
    // Se o admin tentar mudar o e-mail/nome OU a senha, a senha atual é OBRIGATÓRIA para segurança.
    if (!senhaAtual) {
        showToast('A Senha Atual é obrigatória para salvar as alterações.', 'danger');
        return;
    }

    const dadosAtualizados = {
        nome: nome,
        email: email,
        senhaAtual: senhaAtual,
        senhaNova: senhaNova || undefined // Só envia se não for vazia
    };

    const token = getToken();
    if (!token) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        window.location.href = 'loginadm.html';
        return;
    }

    try {
        const response = await fetch('/api/admin/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosAtualizados)
        });

        const data = await response.json();

        if (response.status === 401) {
            showToast(data.error || 'Senha atual incorreta. Verifique e tente novamente.', 'danger');
            return;
        }

        if (!response.ok) {
            showToast(data.error || 'Erro ao salvar alterações. Tente novamente.', 'danger');
            return;
        }

        // Sucesso
        showToast('Configurações salvas com sucesso!', 'success');

        // Limpar campos de senha
        document.getElementById('admin-senha-atual').value = '';
        document.getElementById('admin-senha-nova').value = '';
        document.getElementById('admin-senha-confirmar').value = '';

    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        showToast("Erro de conexão com o servidor.", 'danger');
    }
}

// 🚨 Lembre-se de anexar esta função ao formulário na função inicializarFormularios:
// const formConfig = document.getElementById('form-config-admin');
// formConfig.addEventListener('submit', salvarConfiguracoesAdmin);

// Exportar funções globais para o HTML (Necessário para onclick)
window.editarPromocao = editarPromocao;
window.copiarLink = copiarLink;
window.excluirPromocao = excluirPromocao;

// Conteúdo do script-admin.js
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const errorMessage = document.getElementById('error-message');

    // 🚨 ESTE É O LISTENER QUE FAZ O BOTÃO 'ENTRAR' FUNCIONAR
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Limpa o erro anterior
            loginError.classList.add('d-none');

            // --- Lógica de Autenticação (Chama a API) ---
            fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.token) {
                        // Login bem-sucedido: Salva o token JWT e redireciona
                        localStorage.setItem('authToken', data.token);
                        loginError.classList.add('d-none');
                        window.location.href = 'painel.html';

                    } else {
                        // Login falhou: Exibe a mensagem de erro da API
                        errorMessage.textContent = data.error || 'Usuário ou senha incorretos. Tente novamente.';
                        loginError.classList.remove('d-none');
                        loginError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        document.getElementById('password').value = '';
                        document.getElementById('password').focus();
                    }
                })
                .catch(error => {
                    console.error("Erro de conexão:", error);
                    errorMessage.textContent = 'Não foi possível conectar ao servidor. Verifique o backend.';
                    loginError.classList.remove('d-none');
                });
        });

        // 2. Validação em tempo real para remover o alerta
        const inputs = document.querySelectorAll('#username, #password');
        inputs.forEach(input => {
            input.addEventListener('input', function () {
                if (!loginError.classList.contains('d-none')) {
                    loginError.classList.add('d-none');
                }
            });
        });

    }
});

// SCRIPT DE REDEFINIR SENHA:

// SCRIPT DE REDEFINIR SENHA:

document.addEventListener('DOMContentLoaded', function () {
    const resetForm = document.getElementById('reset-form');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('button-text');
    const buttonSpinner = document.getElementById('button-spinner');

    if (resetForm) {
        // 1. DECLARAÇÃO DE VARIÁVEIS DE CAMPO (TOPO DO IF)
        const novaSenhaInput = document.getElementById('nova-senha');
        const confirmarSenhaInput = document.getElementById('confirmar-senha');
        const toggleButtons = document.querySelectorAll('.toggle-password');


        // 2. DECLARAÇÃO DE FUNÇÕES AUXILIARES (DEVE VIR ANTES DOS LISTENERS!)

        function isPasswordStrong(password) {
            const minLength = password.length >= 6;
            const hasLetters = /[a-zA-Z]/.test(password);
            const hasNumbers = /[0-9]/.test(password);
            return minLength && hasLetters && hasNumbers;
        }

        function clearError() {
            resetError.classList.add('d-none');
        }

        function showError(message) {
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = message;
            resetError.classList.remove('d-none');
            resetError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function validatePasswordStrength(password) {
            const existingIndicator = document.getElementById('password-strength-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            // ... (restante da lógica de validatePasswordStrength) ...

            if (!password) return;
            let strengthText = '';
            let strengthClass = '';

            if (password.length < 6) {
                strengthText = 'Senha muito curta';
                strengthClass = 'strength-weak';
            } else if (!isPasswordStrong(password)) {
                strengthText = 'Senha fraca - use letras e números';
                strengthClass = 'strength-weak';
            } else if (password.length < 8) {
                strengthText = 'Senha média';
                strengthClass = 'strength-medium';
            } else {
                strengthText = 'Senha forte';
                strengthClass = 'strength-strong';
            }

            const strengthIndicator = document.createElement('div');
            strengthIndicator.id = 'password-strength-indicator';
            strengthIndicator.className = `password-strength ${strengthClass}`;
            strengthIndicator.textContent = strengthText;
            novaSenhaInput.parentNode.appendChild(strengthIndicator);
        }

        function simulatePasswordReset() {
            // ... (lógica de simulação, agora acessível) ...
            buttonText.textContent = 'Redefinindo senha...';
            buttonSpinner.classList.remove('d-none');
            submitButton.disabled = true;

            setTimeout(() => {
                buttonText.textContent = 'Salvar nova senha';
                buttonSpinner.classList.add('d-none');
                submitButton.disabled = false;
                resetForm.reset();
                showToast('Senha redefinida com sucesso! Redirecionando para o login.', 'success');

                const strengthIndicator = document.getElementById('password-strength-indicator');
                if (strengthIndicator) {
                    strengthIndicator.remove();
                }

                resetSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    window.location.href = "loginadm.html";
                }, 2000);
            }, 1500);
        }

        // 3. LISTENERS DE EVENTOS (DEVE VIR POR ÚLTIMO)

        // Adicionar evento de clique nos botões de mostrar/ocultar senha
        toggleButtons.forEach(button => {
            button.addEventListener('click', function () {
                const targetId = this.getAttribute('data-target');
                const targetInput = document.getElementById(targetId);
                const icon = this.querySelector('i');

                if (targetInput.type === 'password') {
                    targetInput.type = 'text';
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                } else {
                    targetInput.type = 'password';
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                }
            });
        });

        // Validação em tempo real da força da senha
        novaSenhaInput.addEventListener('input', function () {
            validatePasswordStrength(this.value); // AGORA ACESSÍVEL
            clearError();
        });

        // Validação em tempo real da confirmação de senha
        confirmarSenhaInput.addEventListener('input', function () {
            clearError();
        });

        // Validação do formulário principal
        resetForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const novaSenha = novaSenhaInput.value.trim();
            const confirmarSenha = confirmarSenhaInput.value.trim();

            if (!novaSenha || !confirmarSenha) {
                showError('Por favor, preencha todos os campos.');
                return;
            }
            if (!isPasswordStrong(novaSenha)) { // AGORA ACESSÍVEL
                showError('A senha deve ter pelo menos 6 caracteres, incluindo letras e números.');
                return;
            }
            if (novaSenha !== confirmarSenha) {
                showError('As senhas não coincidem. Por favor, digite a mesma senha nos dois campos.');
                return;
            }
            simulatePasswordReset(); // AGORA ACESSÍVEL
        });

        // Validação em tempo real para remover alertas
        const formInputs = document.querySelectorAll('#reset-form input');
        formInputs.forEach(input => {
            input.addEventListener('input', function () {
                if (!resetError.classList.contains('d-none')) {
                    clearError();
                }
            });
        });

    } // FIM DO if (resetForm)
});

// Adicionar ao bloco do painel no script-principal.js
async function carregarDadosAdmin() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/admin/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            // Sessão expirada
            window.location.href = 'loginadm.html';
            return;
        }

        const data = await response.json();

        // Preenche o formulário e o campo oculto
        document.getElementById('admin-id-hidden').value = data._id; // ID do MongoDB
        document.getElementById('admin-nome').value = data.nome || data.username;
        document.getElementById('admin-email').value = data.email;

    } catch (error) {
        console.error("Erro ao carregar dados do admin:", error);
    }
}

// 🚨 Chamar a função na inicialização:
// Localização: document.addEventListener('DOMContentLoaded', function () { ...
// ADICIONE ISTO:
// carregarDadosAdmin();

// Adicionar ao bloco do painel no script-principal.js

async function cadastrarNovoAdmin(event) {
    event.preventDefault();

    const nome = document.getElementById('novo-admin-nome').value;
    const email = document.getElementById('novo-admin-email').value;
    const password = document.getElementById('novo-admin-senha').value;

    const alertPlaceholder = document.getElementById('register-alert-placeholder');
    // Função auxiliar para mostrar alertas no painel
    const showToast = (msg, tipo) => {
        alertPlaceholder.innerHTML = `<div class="alert alert-${tipo}" role="alert">${msg}</div>`;
        alertPlaceholder.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    alertPlaceholder.innerHTML = '';

    // Validação básica
    if (!nome || !email || !password) {
        showToast('Todos os campos são obrigatórios.', 'danger');
        return;
    }
    if (password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'danger');
        return;
    }

    const dadosRegistro = { nome, email, password };

    // NOTA: O Token JWT NÃO é necessário para o REGISTRO, mas sim para o LOGIN e PUT/DELETE. 
    // Como você já está logado para ACESSAR o painel, a rota /register pode ser pública 
    // ou, idealmente, ter um middleware que apenas administradores possam ACIONAR.
    // Vamos assumir que a rota /register é a que você usou no Postman (pública).

    try {
        const response = await fetch('/api/admin/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosRegistro)
        });

        const data = await response.json();

        if (!response.ok) {
            // Erros como e-mail duplicado (código 400)
            showToast(data.error || data.mensagem || 'Falha no registro.', 'danger');
            return;
        }

        // Sucesso
        showToast(`Administrador "${nome}" registrado com sucesso!`, 'success');

        // Limpar formulário
        document.getElementById('form-cadastro-admin-novo').reset();

    } catch (error) {
        console.error("Erro no registro:", error);
        showToast("Erro de conexão com o servidor.", 'danger');
    }
}

// 🚨 Lembre-se de anexar esta função ao formulário na função inicializarFormularios:
// Localização: function inicializarFormularios() { ... }

const TRANSITION_DURATION = 400; // 400ms

// A DURAÇÃO e a linha document.body.style.opacity = '0'; (antes do DOMContentLoaded) 
// permanecem iguais e são essenciais.

document.addEventListener('DOMContentLoaded', () => {
    // 1. INÍCIO DO FADE-IN (PÁGINA CARREGADA)
    document.body.style.opacity = '1';

    // 2. MANIPULAÇÃO DE LINKS (FADE-OUT)

    // Filtro aprimorado: Seleciona todos os links
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            const novaURL = link.href;
            const hostname = window.location.hostname;
            const pathname = window.location.pathname;

            // --- FILTROS DE EXCLUSÃO (Links que NÃO devem fazer transição) ---

            // A) Exclui links sem um 'href' válido (links JS ou botões falsos)
            if (!novaURL) {
                return;
            }

            // B) Exclui links que abrem em nova aba
            if (link.target === '_blank') {
                return;
            }

            // C) Exclui links usados para navegação interna no painel (data-section)
            if (link.hasAttribute('data-section')) {
                return;
            }

            // D) Exclui links que são âncoras DENTRO da página atual (ex: #topo)
            if (link.hash && link.pathname === pathname) {
                return;
            }

            // E) Exclui links que apontam para a página ATUAL
            // Isso evita que o clique em um link para index.html (estando em index.html) cause transição
            if (link.hostname === hostname && link.pathname === pathname && !link.hash) {
                return;
            }

            // --- SE PASSAR POR TODOS OS FILTROS, É UMA NAVEGAÇÃO REAL ---

            // Previne a navegação padrão do navegador
            e.preventDefault();

            // Inicia o efeito de saída (fade-out)
            document.body.classList.add('page-transition-out');

            // Navega para a nova URL após a animação terminar
            setTimeout(() => {
                window.location.href = novaURL;
            }, TRANSITION_DURATION);
        });
    });

    // ... restante do seu código DOMContentLoaded ...
});

// =======================================================
// NOVAS FUNÇÕES: GERENCIAMENTO DE ADMINISTRADORES
// =======================================================

/**
 * Carrega a lista de administradores e popula a tabela de gerenciamento.
 * NOTA: Esta API deve retornar TODOS os administradores (exceto o que está logado, talvez),
 * mas o endpoint é 'api/admin/all'. Se não existir, use o que você tiver.
 */
// ... (dentro de function carregarAdministradoresNaTabela())
async function carregarAdministradoresNaTabela() {
    const tbody = document.getElementById('tabela-administradores');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-info py-4"><i class="bi bi-arrow-clockwise spinner-border spinner-border-sm me-2"></i> Carregando usuários...</td></tr>`;

    const token = getToken();
    if (!token) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger py-4">Não autorizado. Faça login novamente.</td></tr>`;
        return;
    }

    try {
        const urlApi = '/api/admin/all'; // Verifique se esta rota está correta no seu backend!
        const response = await fetch(urlApi, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Verificação de status não-OK (ex: 404, 500, etc.)
        if (!response.ok) {
            // Tenta obter a mensagem de erro do backend
            let errorMsg = `Falha ao carregar a lista de administradores. (Status: ${response.status})`;
            try {
                const errorData = await response.json();
                // Usa a mensagem de erro do backend, se existir
                errorMsg = errorData.error || errorData.mensagem || errorMsg;
            } catch (e) {
                // Falhou ao ler o JSON (o erro pode ser HTML, por exemplo)
            }

            // Se for 401, faz o redirecionamento
            if (response.status === 401) {
                showToast('Sessão expirada. Faça login novamente.', 'error');
                window.location.href = 'loginadm.html';
                return;
            }

            // Lança o erro para o bloco catch
            throw new Error(errorMsg);
        }

        const admins = await response.json();

        // ... (restante da lógica de exibição de admins) ...

        if (admins.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Nenhum outro administrador cadastrado.</td></tr>`;
            return;
        }

        // --- INÍCIO DA RENDERIZAÇÃO ---
        let html = '';
        const adminLogadoId = document.getElementById('admin-id-hidden').value;

        admins.forEach(admin => {
            const isAdminLogado = admin._id === adminLogadoId;

            html += `
                <tr>
                    <td>${admin.nome || admin.username}</td>
                    <td>${admin.email}</td>
                    <td class="text-center">
                        ${isAdminLogado ?
                    `<span class="badge bg-info">Você</span>` :
                    `
                            <button class="btn btn-sm btn-outline-primary action-btn me-2" onclick="abrirEdicaoAdmin('${admin._id}')">
                                <i class="bi bi-pencil"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-outline-danger action-btn" onclick="excluirAdmin('${admin._id}', '${admin.nome || admin.username}')">
                                <i class="bi bi-trash"></i> Excluir
                            </button>
                            `
                }
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        // --- FIM DA RENDERIZAÇÃO ---

    } catch (error) {
        console.error("Erro ao carregar administradores:", error);
        // Exibe o erro de forma mais detalhada na tabela
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-danger py-4">
                    <i class="bi bi-x-octagon-fill me-2"></i>
                    **Erro de API/Servidor:** ${error.message}
                    <div class="mt-2 text-small text-muted">Verifique o console do navegador e a rota **\`/api/admin/all\`** no seu backend.</div>
                </td>
            </tr>
        `;
    }
}

/**
 * Funções de Ação (Abre o formulário de Dados do Administrador com o usuário para edição)
 * @param {string} id ID do administrador
 */
async function abrirEdicaoAdmin(id) {
    const token = getToken();
    if (!token) return;

    try {
        // ASSUME que a rota para obter um único admin é /api/admin/:id
        const response = await fetch(`/api/admin/${id}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha ao carregar dados do usuário.');
        }

        const adminDataToEdit = await response.json();

        // 1. Preenche o formulário de "Dados do Administrador" com os dados do usuário
        document.getElementById('admin-id-hidden').value = adminDataToEdit._id;
        document.getElementById('admin-nome').value = adminDataToEdit.nome || adminDataToEdit.username;
        document.getElementById('admin-email').value = adminDataToEdit.email;

        // 2. Limpa os campos de senha para forçar que a senha atual seja inserida na edição/atualização
        document.getElementById('admin-senha-atual').value = '';
        document.getElementById('admin-senha-nova').value = '';
        document.getElementById('admin-senha-confirmar').value = '';

        // 3. Destaca o formulário para o usuário saber que está editando
        const formTitle = document.querySelector('#configuracoes .col-md-6:first-child h4');
        if (formTitle) formTitle.textContent = `Dados do Administrador: ${adminDataToEdit.nome || adminDataToEdit.username} (Em Edição)`;

        showToast(`Usuário ${adminDataToEdit.nome || adminDataToEdit.username} carregado para edição.`, 'info');

    } catch (error) {
        console.error("Erro ao carregar administrador para edição:", error);
        showToast(`Erro ao carregar usuário: ${error.message}`, 'error');
    }
}

/**
 * Função para excluir um administrador
 * @param {string} id ID do administrador
 * @param {string} nome Nome do administrador
 */
async function excluirAdmin(id, nome) {
    const adminLogadoId = document.getElementById('admin-id-hidden').value;

    if (id === adminLogadoId) {
        showToast('Você não pode excluir a sua própria conta de administrador.', 'warning');
        return;
    }

    // 1. Confirmação com SweetAlert2
    const result = await Swal.fire({
        title: 'Excluir Administrador?',
        text: `Tem certeza que deseja remover o usuário ${nome}? Esta ação é irreversível.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sim, Excluir!',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    const token = getToken();
    if (!token) {
        showToast('Sessão expirada.', 'error');
        window.location.href = 'loginadm.html';
        return;
    }

    try {
        // ASSUME que a rota para excluir um admin é DELETE /api/admin/:id
        const response = await fetch(`/api/admin/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir administrador.');
        }

        // Sucesso
        await carregarAdministradoresNaTabela(); // Recarrega a lista

        Swal.fire('Excluído!', `O administrador ${nome} foi removido.`, 'success');

    } catch (error) {
        console.error('Erro ao excluir admin:', error);
        showToast(`Falha ao excluir administrador: ${error.message}`, 'error');
    }
}

// Exportar funções globais para o HTML (Necessário para onclick)
window.abrirEdicaoAdmin = abrirEdicaoAdmin;
window.excluirAdmin = excluirAdmin;

// =======================================================
// NOVAS FUNÇÕES: GERENCIAMENTO DE CUPONS (PAINEL)
// =======================================================

function limparFormularioCupom() {
    document.getElementById('form-cadastro-cupom').reset();
    document.getElementById('cupom-id-hidden').value = '';
}

async function carregarCuponsNoIndex() {
    const container = document.getElementById('cupons-container');
    if (!container) return;

    container.innerHTML = `<div class="col-12 text-center text-info py-3"><i class="bi bi-arrow-clockwise spinner-border spinner-border-sm me-2"></i> Buscando cupons...</div>`;

    try {
        // Rota pública para carregar cupons
        const response = await fetch('/api/cupons');

        if (!response.ok) {
            throw new Error('Falha ao carregar cupons.');
        }

        const cupons = await response.json();

        if (cupons.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center my-4">
                    <i class="bi bi-ticket-slash" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="text-muted mt-3">**Não temos cupons disponíveis no momento.**</p>
                </div>
            `;
            return;
        }

        let html = '';
        cupons.forEach(cupom => {
            html += `
                <div class="col-lg-4 col-md-6">
                    <div class="card card-coupon">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title text-primary"><i class="bi bi-shop me-2"></i> ${cupom.loja}</h5>
                                <span class="badge bg-secondary">${cupom.codigo}</span>
                            </div>
                            <p class="card-text">${cupom.descricao}</p>
                            <button class="btn btn-sm btn-outline-success w-100" 
                                onclick="copiarCupom('${cupom.codigo}', '${cupom.link}')">
                                <i class="bi bi-clipboard"></i> Copiar Código e Ir à Loja
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar cupons:", error);
        container.innerHTML = `<div class="col-12 text-center text-danger py-4">Erro ao carregar cupons: ${error.message}</div>`;
    }
}

function copiarCupom(codigo, link) {
    navigator.clipboard.writeText(codigo)
        .then(() => {
            showToast(`Código ${codigo} copiado! Redirecionando...`, 'success');
            // Abre o link em nova aba após a cópia
            window.open(link, '_blank');
        })
        .catch(err => {
            showToast('Erro ao copiar o código. Tente manualmente.', 'error');
            console.error('Erro ao copiar cupom:', err);
        });
}

// =======================================================
// NOVAS FUNÇÕES: CRUD DE CUPONS (PAINEL)
// =======================================================

async function cadastrarCupom(event) {
    event.preventDefault();

    const idEdicao = document.getElementById('cupom-id-hidden').value;

    // AQUI ESTÁ O AJUSTE PRINCIPAL: Se estiver em edição, anexa o ID à URL.
    const metodoHttp = idEdicao ? 'PUT' : 'POST';
    const urlApi = idEdicao ? `/api/cupons/${idEdicao}` : '/api/cupons'; // <-- URL Corrigida

    const token = getToken();
    if (!token) {
        showToast('Sessão expirada. Faça login novamente.', 'error');
        window.location.href = 'loginadm.html';
        return;
    }

    // Captura a string de data (Ex: '2025-12-01')
    const validadeString = document.getElementById('cupom-validade').value;

    // Cria um objeto Date puro.
    let validadeData = new Date(validadeString);

    // FIX FUSO HORÁRIO: Move o horário para o meio-dia (12h) UTC.
    validadeData.setUTCHours(12, 0, 0, 0);

    const dadosCupom = {
        codigo: document.getElementById('cupom-codigo').value,
        descricao: document.getElementById('cupom-descricao').value,
        loja: document.getElementById('cupom-loja').value,
        link: document.getElementById('cupom-link').value,
        validade: validadeData // Enviamos o objeto Date corrigido
    };

    try {
        const response = await fetch(urlApi, { // Usa a urlApi corrigida
            method: metodoHttp,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dadosCupom)
        });

        // 🚨 NOVO TRATAMENTO DE ERRO APRIMORADO
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = errorData.error || 'Erro desconhecido ao salvar o cupom.';

            if (response.status === 404) {
                errorMessage = 'O cupom não foi encontrado no servidor. A edição falhou.';
            } else if (response.status === 400 && errorMessage.includes("ID inválido")) {
                // Este erro vem do backend (CastError) quando o ID é mal formado
                errorMessage = 'Erro no formato do ID do cupom. Recarregue a página.';
            } else if (response.status === 401) {
                errorMessage = 'Sessão expirada. Faça login novamente.';
                window.location.href = 'loginadm.html';
            }

            throw new Error(errorMessage);
        }
        // 🚨 FIM DO NOVO TRATAMENTO DE ERRO APRIMORADO

        const acao = idEdicao ? 'atualizado' : 'cadastrado';
        limparFormularioCupom();

        await carregarCuponsNaTabela();
        if (typeof carregarCuponsNoIndex === 'function') {
            carregarCuponsNoIndex();
        }

        showToast(`Cupom ${acao} com sucesso!`);

    } catch (error) {
        console.error(`Erro na operação de cupom:`, error);
        showToast(`Erro ao salvar cupom: ${error.message}`, 'error');
    }
}

async function carregarCuponsNaTabela() {
    const tbody = document.getElementById('tabela-cupons');
    if (!tbody) return;

    // Colspan alterado para 5, incluindo a nova coluna "Validade"
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-info py-4"><i class="bi bi-arrow-clockwise spinner-border spinner-border-sm me-2"></i> Carregando cupons...</td></tr>`;

    const token = getToken();
    if (!token) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Sessão não autenticada.</td></tr>`;
        return;
    }

    try {
        // Usa a rota do painel para listar todos os cupons (ativos e vencidos)
        const response = await fetch('/api/cupons/painel', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha ao carregar cupons do painel.');
        }

        cuponsPainel = await response.json();

        if (cuponsPainel.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">Nenhum cupom cadastrado.</td></tr>`;
            return;
        }

        let html = '';
        const hoje = new Date();

        cuponsPainel.forEach(cupom => {
            const dataValidade = new Date(cupom.validade);

            // 🚀 FIX Fuso Horário para Exibição: Garante que o dia seja exibido corretamente
            const dataFormatada = dataValidade.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

            // --- Lógica de Status de Vencimento ---

            // 1. Normaliza as datas para a meia-noite UTC (para cálculo preciso)
            const timeAtualUTC = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const timeValidadeUTC = Date.UTC(dataValidade.getFullYear(), dataValidade.getMonth(), dataValidade.getDate());

            const expirado = timeValidadeUTC < timeAtualUTC;

            // 2. Calcula a diferença em dias (a subtração de dois valores UTC é exata)
            // Usa Math.round() que é mais estável para essa diferença de dias inteiros.
            const diffTime = timeValidadeUTC - timeAtualUTC;
            const diferencaDias = Math.round(diffTime / (1000 * 60 * 60 * 24));

            let statusBadge;

            if (expirado) {
                statusBadge = `<span class="badge bg-danger">Expirado</span>`;
            } else if (diferencaDias === 0) {
                // Vence hoje
                statusBadge = `<span class="badge bg-warning text-dark">Vence Hoje!</span>`;
            } else if (diferencaDias <= 7) {
                // 1 a 7 dias
                statusBadge = `<span class="badge bg-warning text-dark">Vence em ${diferencaDias} dias</span>`;
            } else {
                // Mais de 7 dias (Contagem exata exibida)
                statusBadge = `<span class="badge bg-success">Ativo (${diferencaDias} dias)</span>`;
            }

            const validadeCellContent = `${dataFormatada} ${statusBadge}`;

            // --- Fim da Lógica de Status ---

            html += `
                <tr>
                    <td><span class="badge bg-secondary">${cupom.codigo}</span></td>
                    <td>${cupom.descricao}</td>
                    <td>${cupom.loja}</td>
                    <td>${validadeCellContent}</td> 
                    <td>
                        <button class="btn btn-sm btn-outline-primary action-btn me-2" onclick="editarCupom('${cupom._id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger action-btn" onclick="excluirCupom('${cupom._id}', '${cupom.codigo}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar cupons:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Erro de conexão: ${error.message}</td></tr>`;
    }
}

function editarCupom(id) {
    const cupom = cuponsPainel.find(c => c._id === id);
    if (!cupom) {
        showToast('Cupom não encontrado.', 'error');
        return;
    }

    // 1. Preenche o ID Oculto do Cupom para Edição (PUT)
    document.getElementById('cupom-id-hidden').value = cupom._id;
    document.getElementById('cupom-codigo').value = cupom.codigo;
    document.getElementById('cupom-descricao').value = cupom.descricao;
    document.getElementById('cupom-loja').value = cupom.loja;
    document.getElementById('cupom-link').value = cupom.link;

    // 2. Correção de Fuso Horário para input[type="date"]
    // O .toISOString().split('T')[0] converte o objeto Date (que o backend enviou com horário 12h UTC) 
    // para o formato YYYY-MM-DD necessário para o input, sem perder o dia.
    const dataISO = new Date(cupom.validade).toISOString().split('T')[0];
    document.getElementById('cupom-validade').value = dataISO;

    // 3. 🛡️ ETAPA DE PREVENÇÃO (Limpeza do ID do Administrador)
    // Garante que, ao editar um cupom, o ID do Administrador não esteja ativo no formulário de Configurações,
    // prevenindo conflitos no envio de dados caso o usuário navegue entre abas.
    const adminIdHidden = document.getElementById('admin-id-hidden');
    if (adminIdHidden) {
        adminIdHidden.value = '';
    }

    showToast('Cupom carregado para edição. Altere as informações e clique em "Salvar Cupom".', 'info');
}

async function excluirCupom(id, codigo) {
    const result = await Swal.fire({
        title: 'Excluir Cupom?',
        text: `Tem certeza que deseja remover o cupom "${codigo}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    const token = getToken();

    try {
        const response = await fetch(`/api/cupons/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir.');
        }

        await carregarCuponsNaTabela();
        carregarCuponsNoIndex(); // Atualiza a lista pública
        Swal.fire('Excluído!', `O cupom ${codigo} foi removido.`, 'success');

    } catch (error) {
        showToast(`Falha ao excluir cupom: ${error.message}`, 'error');
    }
}

// Exportar funções globais para o HTML
window.editarCupom = editarCupom;
window.excluirCupom = excluirCupom;
window.copiarCupom = copiarCupom;

function limparFormularioCupom() {
    document.getElementById('form-cadastro-cupom').reset();
    document.getElementById('cupom-id-hidden').value = '';
    // NOVO: Limpa o campo de validade
    document.getElementById('cupom-validade').value = '';
}

async function carregarCuponsParaSelecao(promocaoId = null) {
    const selectElement = document.getElementById('cupons-relacionados');
    if (!selectElement) return;

    // A rota /api/cupons retorna apenas cupons ativos (não expirados)
    try {
        const response = await fetch('/api/cupons'); 

        if (!response.ok) {
            throw new Error('Falha ao carregar cupons ativos.');
        }

        const cuponsAtivos = await response.json();
        cuponsAtivosParaSelecao = cuponsAtivos; // Atualiza a variável global

        let htmlOptions = '';
        
        // 🎯 AJUSTE CRÍTICO: Adiciona a opção "Nenhum Cupom" com valor vazio
        htmlOptions += '<option value="">--- NENHUM CUPOM ---</option>';
        
        if (cuponsAtivos.length === 0) {
            htmlOptions = '<option value="" selected>Nenhum cupom ativo encontrado</option>';
            selectElement.innerHTML = htmlOptions;
            return;
        }

        cuponsAtivos.forEach(cupom => {
            // Valor: cupom._id. Texto: Código do Cupom (Loja) - Descrição
            htmlOptions += `<option value="${cupom._id}">${cupom.codigo} (${cupom.loja}) - ${cupom.descricao}</option>`;
        });

        selectElement.innerHTML = htmlOptions;
        
        // Se estivermos em modo de edição, a função editarPromocao() fará a seleção.

    } catch (error) {
        console.error("Erro ao carregar cupons para seleção:", error);
        // Exibir a opção de erro
        selectElement.innerHTML = '<option value="" disabled>Erro ao carregar cupons</option>';
    }
}