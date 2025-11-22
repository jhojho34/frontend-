// Conteúdo do script.js
// Dados das promoções (em um cenário real, viriam de um arquivo JSON)
// let promocoes = JSON.parse(localStorage.getItem("promocoes")) || [];
let promocoes = [];

// Função para calcular o desconto percentual
function calcularDesconto(precoAntigo, precoNovo) {
    return Math.round(((precoAntigo - precoNovo) / precoAntigo) * 100);
}

// Função para formatar preço em Real
function formatarPreco(preco) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(preco);
}

// Função para carregar as promoções
async function carregarPromocoes(promocoesParaExibir = null) {
    const container = document.getElementById('promocoes-container');
    container.innerHTML = 'Carregando ofertas...'; // Feedback de carregamento

    // Se o array de exibição não foi fornecido (ou está vazio), busca na API
    if (promocoesParaExibir === null || promocoesParaExibir.length === 0) {
        try {
            // Rota pública para carregar produtos
            const response = await fetch('/api/promocoes');
            
            if (!response.ok) {
                throw new Error('Falha ao carregar promoções da API.');
            }
            
            // Atualiza a variável global 'promocoes' com os dados do banco
            promocoes = await response.json(); 
            promocoesParaExibir = promocoes;

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            container.innerHTML = '<div class="alert alert-danger" role="alert">Não foi possível carregar as promoções. Verifique o servidor.</div>';
            return; 
        }
    } 
    
    container.innerHTML = ''; // Limpa o container antes de renderizar

    if (promocoesParaExibir.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nenhuma promoção encontrada no momento.</p>';
        return;
    }

    // A partir daqui, a lógica de renderização é executada
    promocoesParaExibir.forEach(promocao => {
        const desconto = calcularDesconto(promocao.precoAntigo, promocao.precoNovo); 

        const card = document.createElement('div');
        card.className = 'col-lg-3 col-md-4 col-sm-6';
        card.innerHTML = `
            <div class="card card-promo">
                <div class="position-relative">
                    <img src="${promocao.imagem}" class="card-img-top" alt="${promocao.titulo}">
                    <span class="discount-badge">-${desconto}%</span>
                </div>
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${promocao.titulo}</h5>
                    
                    <p class="card-text card-description">${promocao.descricao || ''}</p> 

                    <div class="mt-auto">
                        <div class="d-flex align-items-center mb-2">
                            <span class="old-price me-2">${formatarPreco(promocao.precoAntigo)}</span>
                            <span class="new-price">${formatarPreco(promocao.precoNovo)}</span>
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

// Função para filtrar promoções
function filtrarPromocoes() {
    const categoria = document.getElementById('categoria').value;
    const loja = document.getElementById('loja').value;
    const precoMin = parseFloat(document.getElementById('preco-min').value) || 0;
    const precoMax = parseFloat(document.getElementById('preco-max').value) || Infinity;

    const promocoesFiltradas = promocoes.filter(promocao => {
        const atendeCategoria = categoria === 'todas' || promocao.categoria === categoria;
        const atendeLoja = loja === 'todas' || promocao.loja.toLowerCase().includes(loja);
        const atendePreco = promocao.precoNovo >= precoMin && promocao.precoNovo <= precoMax;

        return atendeCategoria && atendeLoja && atendePreco;
    });

    carregarPromocoes(promocoesFiltradas);
}

// Função para limpar filtros
function limparFiltros() {
    document.getElementById('categoria').value = 'todas';
    document.getElementById('loja').value = 'todas';
    document.getElementById('preco-min').value = '';
    document.getElementById('preco-max').value = '';
    carregarPromocoes();
}

// Event Listeners (script.js)
document.addEventListener('DOMContentLoaded', function () {
    // Carregar promoções iniciais
    carregarPromocoes();

    // Adicionar event listeners para os filtros
    document.getElementById('aplicar-filtros').addEventListener('click', filtrarPromocoes);
    document.getElementById('limpar-filtros').addEventListener('click', limparFiltros);

    // Adicionar animação suave ao rolar para as seções
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Conteúdo do script-senha.js
document.addEventListener('DOMContentLoaded', function () {
    // Elementos da página
    const stepEmail = document.getElementById('step-email');
    const stepCode = document.getElementById('step-code');
    const emailForm = document.getElementById('email-form');
    const codeForm = document.getElementById('code-form');
    const emailError = document.getElementById('email-error');
    const emailSuccess = document.getElementById('email-success');
    const codeError = document.getElementById('code-error');
    const codeSuccess = document.getElementById('code-success');
    const resendLink = document.getElementById('resend-link');
    const countdownElement = document.getElementById('countdown');
    const timerElement = document.getElementById('timer');

    // Código fixo para demonstração
    const codigoCorreto = "123456";

    // Variáveis de controle
    let countdownActive = false;
    let countdownTime = 60;

    // Atualizar indicador de etapas
    function updateStepIndicator(step) {
        const steps = document.querySelectorAll('.step');
        const stepLines = document.querySelectorAll('.step-line');

        steps.forEach((s, index) => {
            if (index < step) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });

        stepLines.forEach((line, index) => {
            if (index < step - 1) {
                line.classList.add('active');
            } else {
                line.classList.remove('active');
            }
        });
    }

    // Formatação do código (adiciona automaticamente o traço)
    document.getElementById('code').addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');

        if (value.length > 6) {
            value = value.substring(0, 6);
        }

        // Formata como "123-456" mas armazena sem o traço
        e.target.value = value;
    });

    // Validação do formulário de e-mail
    emailForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value;

        // Validação simples de e-mail
        if (!isValidEmail(email)) {
            showError(emailError, 'Por favor, insira um e-mail válido.');
            return;
        }

        // Simulação de verificação de e-mail no sistema
        // Em um sistema real, aqui seria feita uma requisição para o backend
        if (email === 'ferreirajho400@gmail.com') {
            // E-mail encontrado
            hideAlert(emailError);
            showAlert(emailSuccess);

            // Simular envio do código (em um sistema real, seria enviado por e-mail)
            setTimeout(() => {
                stepEmail.classList.add('d-none');
                stepCode.classList.remove('d-none');
                updateStepIndicator(2);

                // Iniciar contador para reenvio
                startCountdown();
            }, 1500);

        } else {
            // E-mail não encontrado
            showError(emailError, 'E-mail não encontrado em nossa base de dados.');
        }
    });

    // Validação do formulário de código
    codeForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const code = document.getElementById('code').value;

        // Verificar se o código está correto
        if (code === codigoCorreto) {
            hideAlert(codeError);
            showAlert(codeSuccess);

            // Redirecionar após alguns segundos
            setTimeout(() => {
                window.location.href = "redefinir-senha.html";
            }, 2000);

        } else {
            showError(codeError, 'Código incorreto. Tente novamente.');
        }
    });

    // Reenviar código
    resendLink.addEventListener('click', function (e) {
        e.preventDefault();

        if (countdownActive) return;

        // Simular reenvio do código
        hideAlert(codeError);
        showAlert(codeSuccess, 'Novo código enviado! Verifique sua caixa de entrada.');

        // Reiniciar contador
        startCountdown();

        // Ocultar alerta de sucesso após alguns segundos
        setTimeout(() => {
            hideAlert(codeSuccess);
        }, 3000);
    });

    // Função para validar e-mail
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Função para mostrar alerta de erro
    function showError(alertElement, message) {
        const messageElement = alertElement.querySelector('span');
        messageElement.textContent = message;
        alertElement.classList.remove('d-none');

        // Rolagem suave para o alerta
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Função para mostrar alerta de sucesso
    function showAlert(alertElement, message = null) {
        if (message) {
            const messageElement = alertElement.querySelector('span');
            messageElement.textContent = message;
        }
        alertElement.classList.remove('d-none');

        // Rolagem suave para o alerta
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Função para ocultar alerta
    function hideAlert(alertElement) {
        alertElement.classList.add('d-none');
    }

    // Função para iniciar contador de reenvio
    function startCountdown() {
        countdownActive = true;
        countdownTime = 60;
        resendLink.style.pointerEvents = 'none';
        resendLink.style.opacity = '0.5';
        countdownElement.classList.remove('d-none');

        updateCountdown();

        const countdownInterval = setInterval(() => {
            countdownTime--;
            updateCountdown();

            if (countdownTime <= 0) {
                clearInterval(countdownInterval);
                countdownActive = false;
                resendLink.style.pointerEvents = 'auto';
                resendLink.style.opacity = '1';
                countdownElement.classList.add('d-none');
            }
        }, 1000);
    }

    // Função para atualizar o contador
    function updateCountdown() {
        timerElement.textContent = countdownTime;
    }

    // Validação em tempo real para remover alertas quando o usuário começar a digitar
    const emailInput = document.getElementById('email');
    const codeInput = document.getElementById('code');

    emailInput.addEventListener('input', function () {
        if (!emailError.classList.contains('d-none')) {
            hideAlert(emailError);
        }
        if (!emailSuccess.classList.contains('d-none')) {
            hideAlert(emailSuccess);
        }
    });

    codeInput.addEventListener('input', function () {
        if (!codeError.classList.contains('d-none')) {
            hideAlert(codeError);
        }
        if (!codeSuccess.classList.contains('d-none')) {
            hideAlert(codeSuccess);
        }
    });
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

    // SOLUÇÃO 1: Destruir instâncias antigas antes de criar as novas
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

    // Botões de personalização do tema
    document.getElementById('btn-aplicar-tema').addEventListener('click', aplicarTema);
    document.getElementById('btn-resetar-tema').addEventListener('click', resetarTema);
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
    if(idHidden) idHidden.value = '';
}

// NOVO: Função de inicialização exclusiva para o PAINEL
function inicializarPainel() {
    const token = getToken();

    // 🚨 BLOQUEIO DE SEGURANÇA ISOLADO
    if (!token) {
         alert('Você precisa estar logado para acessar o painel.');
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
    
    // 1. Coleta dos dados (permanece igual)
    const nome = document.getElementById('produto-nome').value;
    const categoria = document.getElementById('produto-categoria').value;
    const descricao = document.getElementById('produto-descricao').value;
    const precoAntigo = parseFloat(document.getElementById('produto-preco-antigo').value);
    const precoAtual = parseFloat(document.getElementById('produto-preco-atual').value);
    const loja = document.getElementById('produto-loja').value;
    const imagem = document.getElementById('produto-imagem').value || 'https://via.placeholder.com/300x200/6c757d/ffffff?text=Produto+Sem+Imagem';
    const link = document.getElementById('produto-link').value;

    const token = getToken();
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
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
            alert('Não autorizado. Redirecionando para login.');
            window.location.href = 'loginadm.html';
            return;
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

        // --- CORREÇÃO: RECARREGAR A LISTA DA PÁGINA INICIAL ---
        // Isso garante que, se o admin visitar o index.html, o produto estará lá.
        // A função carregarPromocoes() deve estar disponível globalmente.
        if (typeof carregarPromocoes === 'function') {
            carregarPromocoes();
        }
        // ----------------------------------------------------

        alert(`Promoção ${acao} com sucesso!`);

    } catch (error) {
        console.error(`Erro na operação (${metodoHttp}):`, error);
        alert(`Erro ao salvar promoção: ${error.message}`);
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
            alert('Sessão expirada. Faça login novamente.');
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
        alert('Promoção não encontrada na lista atual.');
        return;
    }

    // Preencher formulário com dados da promoção
    document.getElementById('produto-nome').value = promocao.titulo; // Usar 'titulo' do Model
    document.getElementById('produto-categoria').value = promocao.categoria;
    document.getElementById('produto-descricao').value = promocao.descricao || '';
    document.getElementById('produto-preco-antigo').value = promocao.precoAntigo;
    document.getElementById('produto-preco-atual').value = promocao.precoNovo; // Usar 'precoNovo'
    document.getElementById('produto-loja').value = promocao.loja;
    document.getElementById('produto-imagem').value = promocao.imagem || '';
    document.getElementById('produto-link').value = promocao.link;
    
    // *** MUITO IMPORTANTE PARA EDIÇÃO ***
    // Adicionar um campo oculto para guardar o ID da promoção que está sendo editada
    let idHidden = document.getElementById('produto-id-hidden');
    if (!idHidden) {
        idHidden = document.createElement('input');
        idHidden.type = 'hidden';
        idHidden.id = 'produto-id-hidden';
        document.getElementById('form-cadastro-promocao').appendChild(idHidden);
    }
    idHidden.value = id;
    
    // Navegar para a aba de cadastro
    document.querySelector('[data-section="cadastrar-promocao"]').click();

    alert('Promoção carregada para edição. Faça as alterações necessárias e clique em "Salvar Promoção".');
}

function copiarLink(id) {
    const promocao = promocoesPainel.find(p => p.id === id);
    if (!promocao) return;

    navigator.clipboard.writeText(promocao.link)
        .then(() => {
            alert('Link copiado para a área de transferência!');
        })
        .catch(err => {
            console.error('Erro ao copiar link: ', err);
            alert('Erro ao copiar link. Tente novamente.');
        });
}

async function excluirPromocao(id) {
    if (!confirm('Tem certeza que deseja excluir esta promoção? Esta ação é irreversível.')) return;

    const token = getToken();
    if (!token) {
        alert('Sessão expirada. Faça login novamente.');
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
            alert('Não autorizado. Redirecionando para login.');
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

        alert('Promoção excluída com sucesso!');

    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert(`Falha ao excluir promoção: ${error.message}`);
    }
}

// Adicionar ao bloco do painel no script-principal.js
async function salvarConfiguracoesAdmin(event) {
    event.preventDefault();

    const nome = document.getElementById('admin-nome').value;
    const email = document.getElementById('admin-email').value;
    const senhaAtual = document.getElementById('admin-senha-atual').value;
    const senhaNova = document.getElementById('admin-senha-nova').value;
    const senhaConfirmar = document.getElementById('admin-senha-confirmar').value;

    const alertPlaceholder = document.getElementById('config-alert-placeholder');
    // Função auxiliar para mostrar alertas no painel
    const mostrarAlerta = (msg, tipo) => {
        alertPlaceholder.innerHTML = `<div class="alert alert-${tipo}" role="alert">${msg}</div>`;
        alertPlaceholder.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    alertPlaceholder.innerHTML = ''; // Limpa alertas anteriores

    // 1. Validação de Nova Senha no Front-end
    if (senhaNova && senhaNova.length < 6) {
        mostrarAlerta('A nova senha deve ter pelo menos 6 caracteres.', 'danger');
        return;
    }
    if (senhaNova && senhaNova !== senhaConfirmar) {
        mostrarAlerta('A nova senha e a confirmação não coincidem.', 'danger');
        return;
    }
    
    // 2. Requerimento de Senha Atual
    // Se o admin tentar mudar o e-mail/nome OU a senha, a senha atual é OBRIGATÓRIA para segurança.
    if (!senhaAtual) {
        mostrarAlerta('A Senha Atual é obrigatória para salvar as alterações.', 'danger');
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
        alert('Sessão expirada. Faça login novamente.');
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
            mostrarAlerta(data.error || 'Senha atual incorreta. Verifique e tente novamente.', 'danger');
            return;
        }

        if (!response.ok) {
            mostrarAlerta(data.error || 'Erro ao salvar alterações. Tente novamente.', 'danger');
            return;
        }

        // Sucesso
        mostrarAlerta('Configurações salvas com sucesso!', 'success');
        
        // Limpar campos de senha
        document.getElementById('admin-senha-atual').value = '';
        document.getElementById('admin-senha-nova').value = '';
        document.getElementById('admin-senha-confirmar').value = '';

    } catch (error) {
        console.error("Erro ao salvar configurações:", error);
        mostrarAlerta("Erro de conexão com o servidor.", 'danger');
    }
}

// 🚨 Lembre-se de anexar esta função ao formulário na função inicializarFormularios:
// const formConfig = document.getElementById('form-config-admin');
// formConfig.addEventListener('submit', salvarConfiguracoesAdmin);

function aplicarTema() {
    const corPrincipal = document.getElementById('tema-cor-principal').value;
    const corSecundaria = document.getElementById('tema-cor-secundaria').value;

    // Aplicar cores ao CSS (em um sistema real, isso seria mais sofisticado)
    document.documentElement.style.setProperty('--primary-blue', corPrincipal);
    document.documentElement.style.setProperty('--secondary-blue', corSecundaria);

    alert('Tema aplicado com sucesso!');
}

function resetarTema() {
    document.getElementById('tema-cor-principal').value = '#0d6efd';
    document.getElementById('tema-cor-secundaria').value = '#0a58ca';

    document.documentElement.style.setProperty('--primary-blue', '#0d6efd');
    document.documentElement.style.setProperty('--secondary-blue', '#0a58ca');

    alert('Tema resetado para as cores padrão!');
}

// Exportar funções globais para o HTML (Necessário para onclick)
window.editarPromocao = editarPromocao;
window.copiarLink = copiarLink;
window.excluirPromocao = excluirPromocao;

// Conteúdo do script-admin.js
// Conteúdo do script-admin.js
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const errorMessage = document.getElementById('error-message');

    // As credenciais de exemplo foram removidas, pois a validação agora é feita no backend.

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Limpa o erro anterior
        loginError.classList.add('d-none');

        // --- INÍCIO DA MUDANÇA: Usando FETCH para a API ---
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
                
                // Redirecionamento para o painel administrativo
                window.location.href = 'painel.html'; 

            } else {
                // Login falhou: Exibe a mensagem de erro da API ou uma genérica
                errorMessage.textContent = data.error || 'Usuário ou senha incorretos. Tente novamente.';
                loginError.classList.remove('d-none');

                // Rolagem suave para o alerta
                loginError.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Limpar campos de senha
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
        })
        .catch(error => {
            // Erro de rede ou servidor
            console.error("Erro de conexão:", error);
            errorMessage.textContent = 'Não foi possível conectar ao servidor. Verifique o backend.';
            loginError.classList.remove('d-none');
        });
        // --- FIM DA MUDANÇA ---
    });

    // Validação em tempo real para remover o alerta de erro quando o usuário começar a digitar
    const inputs = document.querySelectorAll('#username, #password');
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            if (!loginError.classList.contains('d-none')) {
                loginError.classList.add('d-none');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const contactForm = document.getElementById('contact-form');
    const formError = document.getElementById('form-error');
    const formSuccess = document.getElementById('form-success');
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('button-text');
    const buttonSpinner = document.getElementById('button-spinner');

    // Validação do formulário
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validar campos
        const nome = document.getElementById('nome').value.trim();
        const email = document.getElementById('email').value.trim();
        const assunto = document.getElementById('assunto').value;
        const mensagem = document.getElementById('mensagem').value.trim();

        // Verificar se todos os campos estão preenchidos
        if (!nome || !email || !assunto || !mensagem) {
            showError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Validar e-mail
        if (!isValidEmail(email)) {
            showError('Por favor, insira um e-mail válido.');
            return;
        }

        // Se chegou aqui, o formulário é válido
        hideAlert(formError);
        simulateSubmission();
    });

    // Função para validar e-mail
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Função para mostrar erro
    function showError(message) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        formError.classList.remove('d-none');

        // Rolagem suave para o alerta
        formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Função para ocultar alerta
    function hideAlert(alertElement) {
        alertElement.classList.add('d-none');
    }

    // Função para simular envio do formulário
    function simulateSubmission() {
        // Mostrar spinner e desabilitar botão
        buttonText.textContent = 'Enviando...';
        buttonSpinner.classList.remove('d-none');
        submitButton.disabled = true;

        // Simular tempo de envio
        setTimeout(() => {
            // Ocultar spinner e reabilitar botão
            buttonText.textContent = 'Enviar mensagem';
            buttonSpinner.classList.add('d-none');
            submitButton.disabled = false;

            // Mostrar mensagem de sucesso
            formSuccess.classList.remove('d-none');

            // Limpar formulário
            contactForm.reset();

            // Rolagem suave para a mensagem de sucesso
            formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Ocultar mensagem de sucesso após alguns segundos
            setTimeout(() => {
                formSuccess.classList.add('d-none');
            }, 5000);

        }, 1500);
    }

    // Validação em tempo real para remover alertas quando o usuário começar a digitar
    const formInputs = document.querySelectorAll('#contact-form input, #contact-form select, #contact-form textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', function () {
            if (!formError.classList.contains('d-none')) {
                hideAlert(formError);
            }
            if (!formSuccess.classList.contains('d-none')) {
                hideAlert(formSuccess);
            }
        });
    });
});

// SCRIPT DE REDEFINIR SENHA:

document.addEventListener('DOMContentLoaded', function () {
    const resetForm = document.getElementById('reset-form');
    const resetError = document.getElementById('reset-error');
    const resetSuccess = document.getElementById('reset-success');
    const submitButton = document.getElementById('submit-button');
    const buttonText = document.getElementById('button-text');
    const buttonSpinner = document.getElementById('button-spinner');

    // Elementos dos campos de senha
    const novaSenhaInput = document.getElementById('nova-senha');
    const confirmarSenhaInput = document.getElementById('confirmar-senha');

    // Botões para mostrar/ocultar senha
    const toggleButtons = document.querySelectorAll('.toggle-password');

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
        validatePasswordStrength(this.value);
        clearError(); // Limpar erro ao usuário digitar
    });

    // Validação em tempo real da confirmação de senha
    confirmarSenhaInput.addEventListener('input', function () {
        clearError(); // Limpar erro ao usuário digitar
    });

    // Validação do formulário
    resetForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const novaSenha = novaSenhaInput.value.trim();
        const confirmarSenha = confirmarSenhaInput.value.trim();

        // Validar se os campos estão preenchidos
        if (!novaSenha || !confirmarSenha) {
            showError('Por favor, preencha todos os campos.');
            return;
        }

        // Validar força da senha
        if (!isPasswordStrong(novaSenha)) {
            showError('A senha deve ter pelo menos 6 caracteres, incluindo letras e números.');
            return;
        }

        // Validar se as senhas coincidem
        if (novaSenha !== confirmarSenha) {
            showError('As senhas não coincidem. Por favor, digite a mesma senha nos dois campos.');
            return;
        }

        // Se chegou aqui, o formulário é válido
        clearError();
        simulatePasswordReset();
    });

    // Função para validar força da senha
    function isPasswordStrong(password) {
        // Pelo menos 6 caracteres, incluindo letras e números
        const minLength = password.length >= 6;
        const hasLetters = /[a-zA-Z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);

        return minLength && hasLetters && hasNumbers;
    }

    // Função para validar e mostrar força da senha em tempo real
    function validatePasswordStrength(password) {
        // Remover indicadores anteriores se existirem
        const existingIndicator = document.getElementById('password-strength-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

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

        // Inserir após o campo de nova senha
        novaSenhaInput.parentNode.appendChild(strengthIndicator);
    }

    // Função para mostrar erro
    function showError(message) {
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = message;
        resetError.classList.remove('d-none');

        // Rolagem suave para o alerta
        resetError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Função para limpar erro
    function clearError() {
        resetError.classList.add('d-none');
    }

    // Função para simular redefinição de senha
    function simulatePasswordReset() {
        // Mostrar spinner e desabilitar botão
        buttonText.textContent = 'Redefinindo senha...';
        buttonSpinner.classList.remove('d-none');
        submitButton.disabled = true;

        // Simular tempo de processamento
        setTimeout(() => {
            // Ocultar spinner e reabilitar botão
            buttonText.textContent = 'Salvar nova senha';
            buttonSpinner.classList.add('d-none');
            submitButton.disabled = false;

            // Mostrar mensagem de sucesso
            resetSuccess.classList.remove('d-none');

            // Limpar formulário
            resetForm.reset();

            // Remover indicador de força da senha
            const strengthIndicator = document.getElementById('password-strength-indicator');
            if (strengthIndicator) {
                strengthIndicator.remove();
            }

            // Rolagem suave para a mensagem de sucesso
            resetSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Redirecionar para a página de login após alguns segundos
            setTimeout(() => {
                window.location.href = "loginadm.html";
            }, 2000);

        }, 1500);
    }

    // Validação em tempo real para remover alertas quando o usuário começar a digitar
    const formInputs = document.querySelectorAll('#reset-form input');
    formInputs.forEach(input => {
        input.addEventListener('input', function () {
            if (!resetError.classList.contains('d-none')) {
                clearError();
            }
        });
    });
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
    const mostrarAlerta = (msg, tipo) => {
        alertPlaceholder.innerHTML = `<div class="alert alert-${tipo}" role="alert">${msg}</div>`;
        alertPlaceholder.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    alertPlaceholder.innerHTML = ''; 

    // Validação básica
    if (!nome || !email || !password) {
        mostrarAlerta('Todos os campos são obrigatórios.', 'danger');
        return;
    }
    if (password.length < 6) {
        mostrarAlerta('A senha deve ter pelo menos 6 caracteres.', 'danger');
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
            mostrarAlerta(data.error || data.mensagem || 'Falha no registro.', 'danger');
            return;
        }

        // Sucesso
        mostrarAlerta(`Administrador "${nome}" registrado com sucesso!`, 'success');
        
        // Limpar formulário
        document.getElementById('form-cadastro-admin-novo').reset();

    } catch (error) {
        console.error("Erro no registro:", error);
        mostrarAlerta("Erro de conexão com o servidor.", 'danger');
    }
}

// 🚨 Lembre-se de anexar esta função ao formulário na função inicializarFormularios:
// Localização: function inicializarFormularios() { ... }

