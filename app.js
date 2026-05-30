// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registrado!'))
            .catch(err => console.error('Erro ao registrar Service Worker', err));
    });
}

// ==========================================================================
// CONTROLE DE PERSISTÊNCIA BLINDADO (localStorage)
// ==========================================================================

// 1. Tenta buscar as tarefas já existentes no dispositivo do usuário
let tasks = JSON.parse(localStorage.getItem('tasks'));

// 2. SE NÃO EXISTIR NADA (Primeira vez que o usuário abre o app na vida):
// Cadastra os dados iniciais obrigatórios exigidos pelo PDF do projeto.
if (tasks === null) {
    tasks = [
        { id: 1, text: 'Comprar mantimentos para a semana', category: 'pessoal', completed: false, date: new Date().toLocaleDateString(), datetime: '', notified: false },
        { id: 2, text: 'Revisar material de Legislação', category: 'estudos', completed: false, date: new Date().toLocaleDateString(), datetime: '', notified: false },
        { id: 3, text: 'Finalizar relatório mensal', category: 'trabalho', completed: true, date: new Date().toLocaleDateString(), datetime: '', notified: false },
        { id: 4, text: 'Agendar consulta de rotina', category: 'pessoal', completed: false, date: new Date().toLocaleDateString(), datetime: '', notified: false },
        { id: 5, text: 'Ajustar folhas de estilo responsivas', category: 'estudos', completed: false, date: new Date().toLocaleDateString(), datetime: '', notified: false }
    ];
    // Salva imediatamente esses dados iniciais no dispositivo
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Variáveis de controle de estado da tela
let currentCategory = 'todas';
let currentFilter = 'all';
let editModal;

// Inicializa a instância do Modal do Bootstrap para controle programático
document.addEventListener("DOMContentLoaded", () => {
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    // Renderiza a tela pela primeira vez com os dados protegidos
    renderCategories();
    renderTasks();
});

// Função universal para salvar qualquer alteração no dispositivo imediatamente
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// ==========================================================================
// RENDERIZAÇÃO DA INTERFACE (CATEGORIAS DINÂMICAS)
// ==========================================================================
function renderCategories() {
    let categories = ['pessoal', 'trabalho', 'estudos'];
    
    // Lê todas as tarefas salvas para descobrir se o usuário criou novas categorias
    tasks.forEach(task => {
        const cat = task.category.trim().toLowerCase();
        if (cat && !categories.includes(cat)) {
            categories.push(cat);
        }
    });

    // Atualiza a lista de sugestões (Autocompletar) do formulário
    const datalist = document.getElementById('categories-datalist');
    if (datalist) {
        datalist.innerHTML = '';
        categories.forEach(cat => {
            datalist.innerHTML += `<option value="${cat.charAt(0).toUpperCase() + cat.slice(1)}">`;
        });
    }

    // Monta a barra lateral esquerda
    const categoryList = document.getElementById('category-list');
    if (categoryList) {
        categoryList.innerHTML = `
            <li class="list-group-item category-item ${currentCategory === 'todas' ? 'active' : ''}" onclick="filterByCategory('todas')">
                <i class="bi bi-inboxes-fill me-2" style="color: ${currentCategory === 'todas' ? 'white' : '#8e8e93'};"></i> Todas
            </li>
        `;

        const colors = ['#34c759', '#ff9500', '#5856d6', '#007aff', '#ff2d55', '#af52de'];
        categories.forEach((cat, index) => {
            const isActive = currentCategory === cat;
            const iconColor = isActive ? 'white' : colors[index % colors.length];
            
            categoryList.innerHTML += `
                <li class="list-group-item category-item ${isActive ? 'active' : ''}" onclick="filterByCategory('${cat}')">
                    <i class="bi bi-collection-fill me-2" style="color: ${iconColor};"></i> ${cat}
                </li>
            `;
        });
    }
}

window.filterByCategory = function(cat) {
    currentCategory = cat;
    const mainContent = document.querySelector('.main-content');
    mainContent.style.opacity = '0';
    
    setTimeout(() => {
        const categoryTitle = document.getElementById('current-category-title');
        categoryTitle.innerText = cat === 'todas' ? 'Todas as Tarefas' : cat.charAt(0).toUpperCase() + cat.slice(1);
        renderCategories();
        renderTasks();
        mainContent.style.opacity = '1';
        mainContent.classList.add('fade-in-content');
        setTimeout(() => mainContent.classList.remove('fade-in-content'), 300);
    }, 150);
}

function updateProductivity() {
    const today = new Date().toLocaleDateString();
    const completedToday = tasks.filter(t => t.completed && t.date === today).length;
    const productivityCounter = document.getElementById('productivity-counter');
    if (productivityCounter) productivityCounter.innerText = completedToday;
}

// ==========================================================================
// RENDERIZAÇÃO DAS TAREFAS (ORDENANDO CONCLUÍDAS PARA O FINAL)
// ==========================================================================
function renderTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    
    // Filtra as tarefas de acordo com a categoria e os botões de cima (todas/pendentes/concluidas)
    let filteredTasks = tasks.filter(task => {
        const matchCategory = currentCategory === 'todas' || task.category.toLowerCase() === currentCategory.toLowerCase();
        const matchFilter = currentFilter === 'all' || 
                           (currentFilter === 'pending' && !task.completed) || 
                           (currentFilter === 'completed' && task.completed);
        return matchCategory && matchFilter;
    });

    // REGRA DE OURO: Ordena a lista empurrando os itens concluídos para o fim
    filteredTasks.sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1; 
    });

    filteredTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `list-group-item d-flex justify-content-between align-items-center task-item bg-transparent ${task.completed ? 'task-completed' : ''}`;
        li.id = `task-node-${task.id}`;
        li.style.animationDelay = `${index * 0.03}s`;
        
        let badgeAlarm = '';
        if (task.datetime && !task.completed) {
            const dateObj = new Date(task.datetime);
            badgeAlarm = `<span class="badge bg-light border text-primary ms-2" style="font-size: 0.75rem;"><i class="bi bi-alarm-fill me-1"></i>${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`;
        }

        li.innerHTML = `
            <div class="d-flex align-items-center w-100" style="cursor: pointer;" onclick="openEditModal(${task.id})">
                <input type="checkbox" class="task-checkbox me-3" ${task.completed ? 'checked' : ''} onchange="event.stopPropagation(); toggleTask(${task.id})">
                <div class="d-flex flex-column">
                    <div>
                        <span class="task-text fw-medium">${task.text}</span>
                        ${badgeAlarm}
                    </div>
                    <small class="text-muted text-capitalize" style="font-size: 0.75rem;">${task.category}</small>
                </div>
            </div>
            <button class="btn btn-sm btn-link text-danger delete-btn" onclick="event.stopPropagation(); deleteTask(${task.id})">
                <i class="bi bi-trash3-fill"></i>
            </button>
        `;
        taskList.appendChild(li);
    });
    
    updateProductivity();
}

// ==========================================================================
// OPERAÇÕES DO BANCO DE DADOS LOCAL (CRUD)
// ==========================================================================

// Criar Lembrete
const taskForm = document.getElementById('task-form');
if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const taskInput = document.getElementById('task-input');
        const taskCategoryInput = document.getElementById('task-category');
        const taskDatetime = document.getElementById('task-datetime');
        const catValue = taskCategoryInput.value.trim().toLowerCase();

        const newTask = {
            id: Date.now(),
            text: taskInput.value.trim(),
            category: catValue ? catValue : 'pessoal',
            datetime: taskDatetime.value,
            completed: false,
            notified: false,
            date: new Date().toLocaleDateString()
        };
        
        tasks.push(newTask);
        saveTasks(); // Grava permanentemente no localStorage
        
        taskInput.value = '';
        taskCategoryInput.value = '';
        taskDatetime.value = '';
        
        renderCategories();
        renderTasks();
    });
}

// Marcar como Concluído
window.toggleTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if(task.completed) task.date = new Date().toLocaleDateString(); 
        saveTasks(); // Atualiza o status permanentemente no localStorage
        setTimeout(() => { renderTasks(); }, 180);
    }
}

// Excluir Lembrete
window.deleteTask = function(id) {
    const element = document.getElementById(`task-node-${id}`);
    if (element) {
        element.classList.add('fade-out');
        setTimeout(() => {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks(); // Salva a remoção permanentemente no localStorage
            renderCategories();
            renderTasks();
        }, 300);
    }
}

// Abrir Modal para Editar
window.openEditModal = function(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        document.getElementById('edit-task-id').value = task.id;
        document.getElementById('edit-task-input').value = task.text;
        document.getElementById('edit-task-category').value = task.category;
        document.getElementById('edit-task-datetime').value = task.datetime || '';
        editModal.show();
    }
}

// Salvar Lembrete Editado
const editTaskForm = document.getElementById('edit-task-form');
if (editTaskForm) {
    editTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-task-id').value);
        const task = tasks.find(t => t.id === id);
        
        if (task) {
            task.text = document.getElementById('edit-task-input').value.trim();
            task.category = document.getElementById('edit-task-category').value.trim().toLowerCase();
            
            if (task.datetime !== document.getElementById('edit-task-datetime').value) {
                task.datetime = document.getElementById('edit-task-datetime').value;
                task.notified = false; 
            }
            
            saveTasks(); // Atualiza a edição permanentemente no localStorage
            editModal.hide();
            
            const taskList = document.getElementById('task-list');
            taskList.style.opacity = '0';
            setTimeout(() => {
                renderCategories();
                renderTasks();
                taskList.style.opacity = '1';
            }, 150);
        }
    });
}

// Solicitar Permissão de Notificação
const mainTaskDatetime = document.getElementById('task-datetime');
if (mainTaskDatetime) {
    mainTaskDatetime.addEventListener('focus', () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    });
}

// ==========================================================================
// MONITOR DE NOTIFICAÇÕES EM SEGUNDO PLANO
// ==========================================================================
function engineNotificationCheck() {
    if ('Notification' in window && Notification.permission === 'granted') {
        const internalNow = new Date().getTime();
        let changed = false;

        tasks.forEach(task => {
            if (task.datetime && !task.completed && !task.notified) {
                const targetTime = new Date(task.datetime).getTime();
                
                if (internalNow >= targetTime) {
                    new Notification("Lembrete Importante!", {
                        body: `${task.text} [Lista: ${task.category.toUpperCase()}]`,
                        icon: 'icon-192.png'
                    });
                    task.notified = true;
                    changed = true;
                }
            }
        });

        if (changed) {
            saveTasks();
            renderTasks();
        }
    }
}
setInterval(engineNotificationCheck, 10000);

// Filtros Superiores (Todas / Pendentes / Concluídas)
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentFilter = e.currentTarget.dataset.filter;
        const taskList = document.getElementById('task-list');
        taskList.style.opacity = '0';
        setTimeout(() => {
            renderTasks();
            taskList.style.opacity = '1';
        }, 120);
    });
});