const DataService = {
    // Busca o ID da URL ou do LocalStorage. Se não houver nada, retorna null.
    get spreadsheetId() {
        const urlParams = new URLSearchParams(window.location.search);
        const sheetFromUrl = urlParams.get('sheet');
        
        if (sheetFromUrl) {
            localStorage.setItem('gym_sheet_id', sheetFromUrl);
            return sheetFromUrl;
        }
        
        return localStorage.getItem('gym_sheet_id');
    },

    async getUsuarios() {
        if (!this.spreadsheetId) return [];
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:json&sheet=Config`;
            const response = await fetch(url);
            const text = await response.text();
            const jsonData = JSON.parse(text.substring(47).slice(0, -2));
            return jsonData.table.rows.map(row => ({
                nome: row.c[0]?.v || '',
                login: String(row.c[1]?.v || '').toLowerCase().trim(),
                aba: row.c[2]?.v || '',
                tipo: row.c[3]?.v ? String(row.c[3].v).toUpperCase() : 'ALUNO'
            })).filter(u => u.login);
        } catch (e) { console.error("Erro na Planilha:", e); return []; }
    },

    async fetchSheetData(sheetName) {
        if (!this.spreadsheetId) return [];
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
            const response = await fetch(url);
            const text = await response.text();
            const jsonData = JSON.parse(text.substring(47).slice(0, -2));
            return jsonData.table.rows.map(row => ({
                semana: String(row.c[0]?.v || '1'),
                dia: row.c[1]?.v || '',
                bloco: row.c[2]?.v || '',
                exercicio: row.c[3]?.v || '',
                seriesReps: row.c[4]?.v || '',
                cargaOriginal: String(row.c[5]?.v || ''),
                notas: row.c[6]?.v || ''
            })).filter(i => i.exercicio);
        } catch (e) { return []; }
    }
};
export default DataService;