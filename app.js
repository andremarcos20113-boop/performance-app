import DataService from './data-service.js';

const App = {
    // --- CONFIGURAÇÃO DE MARCA DO CLIENTE ---
    config: {
        teamName: "CASSIANO",
        teamSlogan: "TEAM",
        logoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200&auto=format&fit=crop", 
    },

    user: JSON.parse(localStorage.getItem('gym_user')) || null,
    state: {
        treinoDataCompleto: [],
        prs: JSON.parse(localStorage.getItem('gym_prs')) || {},
        done: JSON.parse(localStorage.getItem('gym_done')) || {},
        timerInterval: null
    },

    async init() {
        window.App = this;
        this.aplicarLayout();
        this.bindEvents();
        this.gerarOpcoesDescanso();

        // Controla visibilidade da engrenagem
        const btnConfig = document.getElementById('btn-config-trigger');
        if (!DataService.spreadsheetId || (this.user && this.user.tipo === 'ADMIN')) {
            btnConfig?.classList.remove('hidden');
        }

        if (this.user && DataService.spreadsheetId) {
            document.getElementById('btn-logout-header')?.classList.remove('hidden');
            await this.carregarTreino(this.user.aba);
        } else {
            this.showView('view-login');
        }
    },

    // --- RENDERIZAÇÃO DOS CARDS ---
    renderizarCards(filtrados) {
        const container = document.getElementById('container-treino');
        container.innerHTML = filtrados.map((item, idx) => {
            const idUnico = `row-${item.semana}-${item.dia}-${idx}`;
            const isDone = this.state.done[idUnico] || false;
            const prSalvo = this.state.prs[item.exercicio] || 0;
            
            let cargaExibida = item.cargaOriginal;
            let mostrarPR = false;

            const valStr = String(item.cargaOriginal).replace('%','').replace(',','.');
            const valNum = parseFloat(valStr);

            if (String(item.cargaOriginal).includes('%') || (valNum > 0 && valNum < 1.1)) {
                mostrarPR = true;
                const perc = valNum < 1.1 ? valNum * 100 : valNum;
                const multiplicador = perc / 100;
                
                // Criamos um SPAN com ID único para atualizar apenas o número da carga
                const pesoCalculado = prSalvo > 0 ? Math.round(prSalvo * multiplicador) + "kg" : "Defina o PR";
                const classeCor = prSalvo > 0 ? "" : "text-blue-800 text-[10px] font-bold";
                
                cargaExibida = `<span id="target-${idUnico}" class="${classeCor}">${pesoCalculado}</span> <small class="opacity-40">(${Math.round(perc)}%)</small>`;
            }

            return `
                <div id="card-${idUnico}" class="glass-card p-6 ${isDone ? 'card-done' : ''}">
                    <div class="flex justify-between items-center mb-4">
                        <div onclick="App.toggleDone('${idUnico}')" class="flex-1 cursor-pointer">
                            <h3 class="text-white font-black text-xl uppercase italic leading-tight tracking-tighter">${item.exercicio}</h3>
                            <p class="text-blue-500 font-bold text-[10px] uppercase tracking-widest">${item.seriesReps}</p>
                        </div>
                        <div class="flex items-center gap-3">
                             <button onclick="App.openDescanso()" class="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 active:bg-blue-600/20">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span class="text-[8px] font-black uppercase mt-1">Timer</span>
                             </button>
                             <button onclick="App.toggleDone('${idUnico}')" class="w-12 h-12 rounded-2xl border-2 transition-all ${isDone ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/20' : 'border-white/10'} flex items-center justify-center text-lg">${isDone ? '✓' : ''}</button>
                        </div>
                    </div>
                    <div class="flex flex-col gap-4 pt-4 border-t border-white/5">
                        ${mostrarPR ? `
                        <div class="flex items-center justify-between gap-4">
                            <div class="bg-slate-900/50 p-3 rounded-2xl border border-white/5 flex-1">
                                <label class="text-[8px] text-slate-500 uppercase font-black block mb-1">PR (kg)</label>
                                <input type="number" 
                                       value="${prSalvo || ''}" 
                                       inputmode="decimal"
                                       data-ex="${item.exercicio}"
                                       data-perc="${valNum < 1.1 ? valNum : valNum/100}"
                                       data-tid="target-${idUnico}"
                                       class="pr-input w-full bg-transparent text-xl font-black text-white outline-none focus:text-blue-400" 
                                       placeholder="0">
                            </div>
                            <div class="text-right flex-1">
                                 <p class="text-[8px] text-slate-500 uppercase font-black mb-1 italic">Carga</p>
                                 <p class="text-3xl font-black text-blue-400 tabular-nums leading-none">${cargaExibida}</p>
                            </div>
                        </div>
                        ` : `<div class="flex justify-between items-center"><p class="text-[9px] text-slate-500 uppercase font-black italic">Objetivo</p><p class="text-xl font-black text-blue-400 uppercase">${item.cargaOriginal}</p></div>`}
                        ${item.notas ? `<p class="text-[10px] text-slate-500 italic leading-tight border-t border-white/5 pt-3">${item.notas}</p>` : ''}
                    </div>
                </div>`;
        }).join('');
    },

    // --- SALVAMENTO E ATUALIZAÇÃO CIRÚRGICA (FIM DO BUG DO CURSOR) ---
    savePR(ex, val, targetId, percent) { 
        const peso = parseFloat(val) || 0;
        this.state.prs[ex] = peso; 
        localStorage.setItem('gym_prs', JSON.stringify(this.state.prs));
        
        // Atualiza apenas o texto do elemento alvo sem reconstruir o card
        const display = document.getElementById(targetId);
        if (display) {
            if (peso > 0) {
                display.innerText = Math.round(peso * percent) + "kg";
                display.classList.remove('text-blue-800', 'text-[10px]', 'font-bold');
            } else {
                display.innerText = "Defina o PR";
                display.classList.add('text-blue-800', 'text-[10px]', 'font-bold');
            }
        }
    },

    bindEvents() {
        // Evento de Digitação (INPUT): Atualiza o cálculo em tempo real sem perder o foco
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('pr-input')) {
                const ds = e.target.dataset;
                this.savePR(ds.ex, e.target.value, ds.tid, parseFloat(ds.perc));
            }
        });

        document.getElementById('btn-entrar')?.addEventListener('click', () => this.realizarLogin());
        document.getElementById('btn-logout-header')?.addEventListener('click', () => this.logout());
        document.getElementById('btn-config-trigger')?.addEventListener('click', () => document.getElementById('modal-config').classList.remove('hidden'));
        document.getElementById('btn-verify-admin')?.addEventListener('click', () => this.verificarAdmin());
        document.getElementById('btn-salvar-config')?.addEventListener('click', () => {
            const id = document.getElementById('input-sheet-id').value.trim();
            if (id) { localStorage.setItem('gym_sheet_id', id); location.reload(); }
        });
        document.getElementById('btn-fechar-config')?.addEventListener('click', () => document.getElementById('modal-config').classList.add('hidden'));
        document.getElementById('overlay-descanso')?.addEventListener('click', () => this.closeDescanso());
    },

    // --- FUNÇÕES DE APOIO ---
    async carregarTreino(aba) {
        this.showView('view-treino');
        const badge = document.getElementById('user-badge');
        if(badge) { badge.innerText = this.user.nome; badge.classList.remove('hidden'); }
        const container = document.getElementById('container-treino');
        container.innerHTML = `<div class="py-20 text-center animate-pulse text-blue-600 font-bold text-[10px]">SINCRONIZANDO...</div>`;
        const dados = await DataService.fetchSheetData(aba);
        this.state.treinoDataCompleto = dados;
        this.configurarFiltros(dados);
    },

    configurarFiltros(dados) {
        const selS = document.getElementById('select-semana');
        const selD = document.getElementById('select-dia');
        const semanas = [...new Set(dados.map(i => String(i.semana)))].sort((a,b) => a-b);
        if(selS) selS.innerHTML = semanas.map(s => `<option value="${s}">Semana ${s}</option>`).join('');
        const atualizar = () => {
            const dias = [...new Set(dados.filter(d => String(d.semana) === selS.value).map(d => d.dia))];
            const ord = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"].filter(d => dias.includes(d));
            if(selD) selD.innerHTML = ord.map(d => `<option value="${d}">${d}</option>`).join('');
            this.filtrar();
        };
        if(selS) selS.onchange = atualizar;
        if(selD) selD.onchange = () => this.filtrar();
        atualizar();
    },

    filtrar() {
        const sem = document.getElementById('select-semana').value;
        const dia = document.getElementById('select-dia').value;
        const filtrados = this.state.treinoDataCompleto.filter(i => String(i.semana) === sem && i.dia === dia);
        this.renderizarCards(filtrados);
    },

    aplicarLayout() {
        document.getElementById('team-name-header').innerHTML = `${this.config.teamName} <span class="text-accent not-italic">${this.config.teamSlogan}</span>`;
        document.getElementById('team-name-login').innerText = `${this.config.teamName} ${this.config.teamSlogan}`;
        document.getElementById('login-logo').src = this.config.logoUrl;
    },

    showView(id) {
        document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
        document.getElementById(id)?.classList.remove('hidden');
    },

    gerarOpcoesDescanso() {
        const tempos = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];
        document.getElementById('timer-options').innerHTML = tempos.map(t => `<button onclick="App.startTimer(${t})" class="bg-white/5 border border-white/10 py-4 rounded-2xl font-black text-white active:scale-95 transition-all">${t < 60 ? t+'s' : (t/60).toFixed(1)+'m'}</button>`).join('');
    },

    startTimer(seg) {
        this.closeDescanso(); clearInterval(this.state.timerInterval);
        const display = document.getElementById('timer-display');
        const clock = document.getElementById('timer-clock');
        const label = document.getElementById('timer-label');
        display.classList.remove('hidden'); clock.classList.remove('timer-alert');
        label.innerText = "Descansando";
        let t = parseInt(seg);
        this.state.timerInterval = setInterval(() => {
            t--;
            const m = Math.floor(t / 60); const s = t % 60;
            clock.innerText = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            if (t <= 5 && t > 0) document.getElementById('beep-sound').play();
            if (t <= 0) {
                clock.innerText = "00:00"; clock.classList.add('timer-alert');
                label.innerText = "VOLTAR AO TREINO!";
                let extra = 5;
                const final = setInterval(() => { document.getElementById('beep-sound').play(); extra--; if(extra <= 0){ clearInterval(final); display.classList.add('hidden'); } }, 1000);
                clearInterval(this.state.timerInterval);
            }
        }, 1000);
    },

    async realizarLogin() {
        const input = document.getElementById('input-login').value.toLowerCase().trim();
        if (!input) return;
        try {
            const users = await DataService.getUsuarios();
            const u = users.find(x => x.login === input);
            if (u) { localStorage.setItem('gym_user', JSON.stringify(u)); location.reload(); } else { alert("Acesso Negado!"); }
        } catch (e) { alert("Erro ao conectar."); }
    },

    async verificarAdmin() {
        const input = document.getElementById('admin-login-check').value.toLowerCase().trim();
        const step1 = document.getElementById('config-step-1');
        const step2 = document.getElementById('config-step-2');
        if (!DataService.spreadsheetId) { step1.classList.add('hidden'); step2.classList.remove('hidden'); return; }
        if (!input) return alert("Digite seu login!");
        try {
            const users = await DataService.getUsuarios();
            const admin = users.find(u => u.login === input && u.tipo === 'ADMIN');
            if (admin) { step1.classList.add('hidden'); step2.classList.remove('hidden'); document.getElementById('input-sheet-id').value = DataService.spreadsheetId; } else { alert("Acesso Negado!"); }
        } catch (e) { alert("Erro ao validar."); }
    },

    toggleDone(id) { this.state.done[id] = !this.state.done[id]; localStorage.setItem('gym_done', JSON.stringify(this.state.done)); this.filtrar(); },
    logout() { localStorage.clear(); location.reload(); },
    openDescanso() { document.getElementById('overlay-descanso').classList.remove('hidden'); document.getElementById('sheet-descanso').classList.add('open'); },
    closeDescanso() { document.getElementById('overlay-descanso').classList.add('hidden'); document.getElementById('sheet-descanso').classList.remove('open'); },
    resetTimer() { clearInterval(this.state.timerInterval); document.getElementById('timer-display').classList.add('hidden'); }
};

document.addEventListener('DOMContentLoaded', () => App.init());
