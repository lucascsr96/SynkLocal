/**
 * Aplicação de Catálogo Comercial Interativo (SPA)
 * Autor: Gemini
 * Arquitetura: Single-Page Application com Roteamento por Hash em JS Puro.
 */
document.addEventListener('DOMContentLoaded', () => {

    const App = {
        // --- PROPRIEDADES DA APLICAÇÃO ---
        elements: {
            root: document.getElementById('app-root'),
        },
        data: [],
        map: null,
        markers: L.layerGroup(),
        state: {
            currentFilter: 'all',
            searchTerm: '',
        },
        
        // --- INICIALIZAÇÃO ---
        init() {
            this.data = this.generateBusinessData(100);
            this.router();
            window.addEventListener('hashchange', () => this.router());
        },

        // --- ROTEADOR ---
        router() {
            const hash = window.location.hash || '#/catalogo';
            const [path, id] = hash.substring(2).split('/');
            
            this.elements.root.innerHTML = ''; // Limpa a página anterior

            switch(path) {
                case 'catalogo':
                    this.renderCatalogPage();
                    break;
                case 'empresa':
                    this.renderDetailPage(id);
                    break;
                default:
                    this.renderNotFoundPage();
            }
        },

        // --- RENDERIZAÇÃO DAS PÁGINAS ---
        renderCatalogPage() {
            const page = this.createDOMElement('div', 'catalog-page');

            // Seção de Filtros
            const filtersSection = this.createDOMElement('div', 'filters-section');
            const searchBar = this.createDOMElement('input', 'search-bar');
            searchBar.type = 'text';
            searchBar.placeholder = 'Buscar por nome ou serviço...';
            searchBar.onkeyup = (e) => this.handleSearch(e.target.value);
            
            const filterButtons = this.createDOMElement('div', 'filter-buttons');
            const categories = ['all', ...new Set(this.data.map(b => b.category))];
            categories.forEach(cat => {
                const btn = this.createDOMElement('button', 'filter-btn');
                btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                btn.dataset.category = cat;
                if(cat === this.state.currentFilter) btn.classList.add('active');
                btn.onclick = () => this.handleFilter(cat);
                filterButtons.appendChild(btn);
            });

            filtersSection.append(searchBar, filterButtons);

            // Mapa e Grid
            const mapContainer = this.createDOMElement('div', null, 'map');
            const grid = this.createDOMElement('div', 'business-grid');

            page.append(filtersSection, mapContainer, grid);
            this.elements.root.appendChild(page);

            this.initMap();
            this.renderBusinessList();
        },

        renderDetailPage(id) {
            const business = this.data.find(b => b.id == id);
            if (!business) { this.renderNotFoundPage(); return; }

            const page = this.createDOMElement('div', 'detail-page');
            page.innerHTML = `
                <a href="#/catalogo" class="back-link">&larr; Voltar para o Catálogo</a>
                <div class="detail-header">
                    <h2>${business.name}</h2>
                    <p>${business.tagline}</p>
                </div>
                <div class="detail-info">
                     <div class="carousel">
                        <div class="carousel-inner">
                            ${business.images.map(img => `<img src="${img.url}" alt="${img.alt}">`).join('')}
                        </div>
                        <button class="carousel-btn prev">${this.icons.chevronLeft}</button>
                        <button class="carousel-btn next">${this.icons.chevronRight}</button>
                    </div>
                    <p class="detail-description">${business.description}</p>
                    <div class="social-links">
                        <a href="${business.instagram}" target="_blank" class="social-btn instagram">${this.icons.instagram} Instagram</a>
                        <a href="${business.whatsapp}" target="_blank" class="social-btn whatsapp">${this.icons.whatsapp} WhatsApp</a>
                    </div>
                </div>
            `;
            this.elements.root.appendChild(page);
            this.initializeCarousel(page.querySelector('.carousel'));
        },
        
        renderNotFoundPage() {
            this.elements.root.innerHTML = `<h2>Página não encontrada</h2><a href="#/catalogo">Voltar</a>`;
        },

        // --- LÓGICA DO CATÁLOGO ---
        renderBusinessList() {
            const grid = this.elements.root.querySelector('.business-grid');
            if(!grid) return;
            
            grid.innerHTML = '';
            this.markers.clearLayers();

            const filteredData = this.data.filter(b => 
                (this.state.currentFilter === 'all' || b.category === this.state.currentFilter) &&
                (b.name.toLowerCase().includes(this.state.searchTerm) || b.description.toLowerCase().includes(this.state.searchTerm))
            );

            if (filteredData.length === 0) {
                grid.innerHTML = '<p>Nenhuma empresa encontrada.</p>';
                return;
            }
            
            filteredData.forEach(business => {
                // Adiciona card no grid
                const card = this.createDOMElement('a', 'business-card');
                card.href = `#/empresa/${business.id}`;
                card.innerHTML = `
                    <img src="${business.logo}" alt="Logo de ${business.name}" class="card-logo">
                    <div class="card-info">
                        <h2>${business.name}</h2>
                        <p>${business.tagline}</p>
                    </div>
                `;
                grid.appendChild(card);

                // Adiciona marcador no mapa
                const marker = L.marker(business.coordinates).bindPopup(`<h3>${business.name}</h3><p>${business.tagline}</p>`);
                marker.on('click', () => window.location.hash = `#/empresa/${business.id}`);
                this.markers.addLayer(marker);
            });
        },

        handleSearch(term) {
            this.state.searchTerm = term.toLowerCase();
            this.renderBusinessList();
        },

        handleFilter(category) {
            this.state.currentFilter = category;
            this.elements.root.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });
            this.renderBusinessList();
        },

        // --- LÓGICA DO MAPA (LEAFLET.JS) ---
        initMap() {
            if (this.map) this.map.remove();
            this.map = L.map('map').setView([-23.5505, -46.6333], 12); // Coordenadas de São Paulo
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
            this.markers.addTo(this.map);
        },

        // --- UTILITÁRIOS ---
        initializeCarousel(carouselElement) {
            const inner = carouselElement.querySelector('.carousel-inner');
            const nextBtn = carouselElement.querySelector('.next');
            const prevBtn = carouselElement.querySelector('.prev');
            const totalImages = carouselElement.querySelectorAll('img').length;
            let currentIndex = 0;
            const update = () => inner.style.transform = `translateX(-${currentIndex * 100}%)`;
            nextBtn.addEventListener('click', () => { currentIndex = (currentIndex + 1) % totalImages; update(); });
            prevBtn.addEventListener('click', () => { currentIndex = (currentIndex - 1 + totalImages) % totalImages; update(); });
        },
        
        createDOMElement(tag, className, id) {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (id) element.id = id;
            return element;
        },

        icons: {
            chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`,
            chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24px" height="24px"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`,
            instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20px" height="20px"><path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>`,
            whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20px" height="20px"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.46 3.48 1.28 4.98L2 22l5.25-1.38c1.45.77 3.09 1.19 4.79 1.19h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.05 3.67c4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.23-8.23 8.23-1.54 0-2.98-.43-4.22-1.16l-.3-.18-3.12.82.83-3.04-.2-.31a8.183 8.183 0 0 1-1.26-4.38c0-4.54 3.69-8.23 8.23-8.23zm-1.2 2.96c-.28-.14-1.66-.82-1.92-.91s-.45-.14-.64.14-.73.91-.89 1.1s-.33.21-.61.07c-1.12-.54-1.85-1.24-2.16-1.72s-.31-.76-.07-.99c.21-.21.45-.54.68-.81s.14-.21.21-.35-.07-.28-.28-.56s-.73-1.76-.99-2.41-.54-.55-.64-.55c-.21 0-.38 0-.55.07s-.45.21-.68.56-.91 1.08-.91 2.62.93 3.04 1.06 3.25 1.85 2.81 4.49 3.96 1.76.78 2.36.64.99-.07 1.15-.81.15-.99.11-1.08s-.07-.15-.28-.28z"/></svg>`
        },

        generateBusinessData(count) {
            const data = [];
            const templates = [
                { category: "restaurante", names: ["Sabor do Chef", "Tempero da Casa", "Bistrô Aconchego"], images: ["1640774", "262973", "958670"], coords: [-23.561, -46.656] },
                { category: "serviços", names: ["Navalha de Prata Barbearia", "Estética Pele de Seda", "Oficina Torque Certo"], images: ["2061820", "3762875", "4489749"], coords: [-23.548, -46.638] },
                { category: "lojas", names: ["Floricultura Encanto", "Livraria A Trama", "Mundo Pet"], images: ["849953", "1106468", "45170"], coords: [-23.555, -46.634] },
                { category: "cafeteria", names: ["Café Grão Roxo", "Expresso Digital", "Aroma do Vale"], images: ["302899", "1749821", "312418"], coords: [-23.551, -46.644] },
                { category: "saúde", names: ["Studio Corpo em Foco", "Consultório Sorriso Perfeito"], images: ["4167438", "6528859", "3845982"], coords: [-23.565, -46.661] },
            ];
            for (let i = 1; i <= count; i++) {
                const tpl = templates[i % templates.length];
                const name = `${tpl.names[i % tpl.names.length]} #${i}`;
                const phone = `55119${(88888888 - i).toString().padStart(8, '0')}`;
                data.push({
                    id: i, name: name, category: tpl.category,
                    tagline: `O melhor de ${tpl.category} na região.`,
                    description: `Bem-vindo ao ${name}! Oferecemos serviços e produtos de alta qualidade com um atendimento diferenciado. Nossa missão é garantir sua total satisfação. Venha nos conhecer!`,
                    logo: `https://images.pexels.com/photos/${tpl.images[0]}/pexels-photo-${tpl.images[0]}.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1`,
                    images: tpl.images.map((imgId, idx) => ({ url: `https://images.pexels.com/photos/${imgId}/pexels-photo-${imgId}.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1`, alt: `Foto ${idx + 1} de ${name}` })),
                    instagram: `https://instagram.com/`, whatsapp: `https://wa.me/${phone}`,
                    coordinates: [tpl.coords[0] + (Math.random() - 0.5) * 0.05, tpl.coords[1] + (Math.random() - 0.5) * 0.05]
                });
            }
            return data;
        }
    };

    App.init(); // Inicia a aplicação
});