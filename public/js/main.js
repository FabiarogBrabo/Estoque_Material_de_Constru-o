// Aguarda o DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {

    // --- Lógica do Modal de Produtos (Adicionar/Editar) ---
    const modal = document.getElementById("modalProduto");
    const btnNovo = document.getElementById("btnNovoProduto");
    
    if (btnNovo) {
        btnNovo.onclick = () => {
            // Limpa o formulário para "Adicionar"
            document.getElementById("formProduto").action = "/app/produtos/add";
            document.getElementById("modalTitulo").innerText = "Adicionar Novo Produto";
            document.getElementById("produtoId").value = "";
            document.getElementById("nome").value = "";
            document.getElementById("descricao").value = "";
            document.getElementById("estoque_minimo").value = "";
            document.getElementById("estoque_atual").value = "";
            document.getElementById("unidade_medida").value = "";
            document.getElementById("data_validade").value = "";
            
            modal.style.display = "block";
            modal.style.opacity = 1; // Ativa a animação de fade-in
        };
    }
    
    // --- Lógica de Busca/Filtro na Tabela de Produtos ---
    const inputBusca = document.getElementById("buscaProduto");
    const tabelaProdutos = document.getElementById("tabelaProdutos");
    
    if (inputBusca && tabelaProdutos) {
        inputBusca.addEventListener("keyup", (e) => {
            const termoBusca = e.target.value.toLowerCase();
            const linhas = tabelaProdutos.getElementsByTagName("tbody")[0].getElementsByTagName("tr");

            for (let linha of linhas) {
                // Busca pelo nome (coluna 1)
                const nomeProduto = linha.getElementsByTagName("td")[1].innerText.toLowerCase();
                
                if (nomeProduto.includes(termoBusca)) {
                    linha.style.display = ""; // Mostra a linha
                } else {
                    linha.style.display = "none"; // Oculta a linha
                }
            }
        });
    }

});

// --- Funções Globais (chamadas pelo HTML) ---

// Fechar o modal
function fecharModal() {
    const modal = document.getElementById("modalProduto");
    modal.style.opacity = 0;
    // Adiciona um pequeno delay para a animação de fade-out
    setTimeout(() => {
        modal.style.display = "none";
    }, 400); // O tempo deve ser o mesmo da transição no CSS
}

// Abrir modal para Edição
async function abrirModalEdicao(id) {
    try {
        // Busca os dados atuais do produto na API
        const response = await fetch(`/app/api/produtos/${id}`);

        if (!response.ok) {
            throw new Error('Produto não encontrado.');
        }
        const produto = await response.json();

        // Preenche o formulário com os dados
        document.getElementById("formProduto").action = "/app/produtos/edit";
        document.getElementById("modalTitulo").innerText = "Editar Produto";
        document.getElementById("produtoId").value = produto.id;
        document.getElementById("nome").value = produto.nome;
        document.getElementById("descricao").value = produto.descricao || "";
        document.getElementById("estoque_minimo").value = produto.estoque_minimo;
        document.getElementById("estoque_atual").value = produto.estoque_atual;
        document.getElementById("unidade_medida").value = produto.unidade_medida;
        
        // Formata a data para o input type="date" (AAAA-MM-DD)
        if (produto.data_validade) {
            const data = new Date(produto.data_validade).toISOString().split('T')[0];
            document.getElementById("data_validade").value = data;
        } else {
             document.getElementById("data_validade").value = "";
        }

        // CORREÇÃO AQUI: O ID do modal estava errado
        const modal = document.getElementById("modalProduto"); 
        modal.style.display = "block";
        modal.style.opacity = 1;

    } catch (error) {
        alert("Erro ao carregar dados do produto: " + error.message);
    }
}

// Excluir Produto
async function excluirProduto(id, nome) {
    // Usamos um 'confirm' simples. Em um app real, usaríamos um modal customizado
    if (!confirm(`Tem certeza que deseja excluir o produto "${nome}"?`)) {
        return;
    }

    try {

        const response = await fetch(`/app/api/produtos/${id}`, {

            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert('Produto excluído com sucesso!');
            window.location.reload(); // Recarrega a página
        } else {
            throw new Error(result.error || 'Erro desconhecido.');
        }

    } catch (error) {
        // Exibe o erro de restrição de chave estrangeira
        alert("Erro ao excluir produto: " + error.message);
    }
}


