/**
 * TSP Delivery Game - Core Logic
 * Implements TSP algorithms: Brute Force, Greedy, and Dynamic Programming (Held-Karp)
 * with real-time canvas visualization.
 */

class TSPGame {
    constructor() {
        this.canvas = document.getElementById('tsp-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.cities = [];
        this.selectedAlgo = 'greedy';
        this.isSolving = false;
        this.visualizationSpeed = 50;
        this.gameMode = false;
        this.userPath = [];
        this.complexityCanvas = document.getElementById('complexity-chart');
        this.complexityCtx = this.complexityCanvas?.getContext('2d');
        
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Canvas Events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // UI Events
        document.querySelectorAll('.algo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedAlgo = e.target.dataset.algo;
                this.updateAlgoDescription();
            });
        });

        document.getElementById('solve-btn').addEventListener('click', () => this.solve());
        document.getElementById('clear-btn').addEventListener('click', () => this.clear());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetColors());
        document.getElementById('example-btn').addEventListener('click', () => this.loadExample());
        document.getElementById('compare-btn').addEventListener('click', () => this.compareAll());
        document.getElementById('game-mode-toggle').addEventListener('change', (e) => {
            this.gameMode = e.target.checked;
            this.userPath = [];
            document.getElementById('instruction-text').innerText = this.gameMode ? 
                "Click hubs in order to build your route" : "Click anywhere to add a delivery hub";
            this.render();
        });

        const speedSlider = document.getElementById('speed-slider');
        speedSlider.addEventListener('input', (e) => {
            this.visualizationSpeed = e.target.value;
        });

        this.updateAlgoDescription();
        this.render();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        
        if (this.complexityCanvas) {
            this.complexityCanvas.width = this.complexityCanvas.parentElement.clientWidth;
            this.complexityCanvas.height = this.complexityCanvas.parentElement.clientHeight;
        }

        this.render();
        this.updateComplexity();
    }

    handleMouseDown(e) {
        if (this.isSolving) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.gameMode) {
            // Check if we clicked an existing city to add to path
            const clickedCityIndex = this.cities.findIndex(c => {
                const dist = Math.sqrt((c.x - x)**2 + (c.y - y)**2);
                return dist < 20;
            });

            if (clickedCityIndex !== -1) {
                if (!this.userPath.includes(clickedCityIndex)) {
                    this.userPath.push(clickedCityIndex);
                    if (this.userPath.length === this.cities.length) {
                        // Automatically close the loop if all cities visited
                        this.userPath.push(this.userPath[0]);
                        this.calculateUserCost();
                    }
                } else if (this.userPath.length > 0 && clickedCityIndex === this.userPath[0] && this.userPath.length >= 2) {
                     // Manual close loop
                     this.userPath.push(clickedCityIndex);
                     this.calculateUserCost();
                }
            }
        } else {
            // Add new city
            if (this.cities.length < 15) {
                this.cities.push({ x, y, id: this.cities.length });
                document.getElementById('city-count').innerText = this.cities.length;
            } else {
                alert("Maximum limit of 15 hubs reached for performance.");
            }
        }
        this.render();
        this.updateComplexity();
    }

    calculateUserCost() {
        let cost = 0;
        for (let i = 0; i < this.userPath.length - 1; i++) {
            cost += this.getDistance(this.cities[this.userPath[i]], this.cities[this.userPath[i+1]]);
        }
        document.getElementById('current-cost').innerText = cost.toFixed(2);
        document.getElementById('route-display').innerText = this.userPath.join(" → ");
    }

    getDistance(c1, c2) {
        return Math.sqrt((c1.x - c2.x)**2 + (c1.y - c2.y)**2);
    }

    clear() {
        this.cities = [];
        this.userPath = [];
        this.isSolving = false;
        document.getElementById('city-count').innerText = "0";
        document.getElementById('current-cost').innerText = "0.00";
        document.getElementById('best-cost').innerText = "N/A";
        document.getElementById('route-display').innerText = "Start placing hubs...";
        this.render();
        this.updateComplexity();
    }

    resetColors() {
        this.isSolving = false;
        this.userPath = [];
        this.render();
    }

    loadExample() {
        this.clear();
        const center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.35;
        const count = 6;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.cities.push({
                x: center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
                y: center.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
                id: i
            });
        }
        document.getElementById('city-count').innerText = this.cities.length;
        this.render();
    }

    updateAlgoDescription() {
        const descs = {
            greedy: "Greedy (Nearest Neighbor) picks the closest unvisited city at each step. Fast O(n²), but often suboptimal.",
            bruteforce: "Brute Force explores every single possible permutation. Guaranteed optimal, but extremely slow O(n!). Limited to 10 cities.",
            dp: "Held-Karp DP uses bitmasking and memoization to find the shortest path. Optimal and relatively efficient O(n² 2ⁿ)."
        };
        document.getElementById('algo-desc').innerText = descs[this.selectedAlgo];
    }

    async solve() {
        if (this.cities.length < 2 || this.isSolving) return;
        
        this.isSolving = true;
        this.userPath = [];
        document.getElementById('status-text').innerText = "Solving...";
        
        let result;
        const startTime = performance.now();

        if (this.selectedAlgo === 'greedy') {
            result = await this.solveGreedy();
        } else if (this.selectedAlgo === 'bruteforce') {
            if (this.cities.length > 10) {
                alert("Brute Force is limited to 10 cities to prevent browser freezing.");
                this.isSolving = false;
                return;
            }
            result = await this.solveBruteForce();
        } else if (this.selectedAlgo === 'dp') {
            result = await this.solveDP();
        }

        const endTime = performance.now();
        const cost = result.cost;
        const path = result.path;

        document.getElementById('current-cost').innerText = cost.toFixed(2);
        document.getElementById('route-display').innerText = path.join(" → ");
        document.getElementById('status-text').innerText = `Finished (${(endTime - startTime).toFixed(1)}ms)`;
        
        this.userPath = path;
        this.isSolving = false;
        this.render();
    }

    async compareAll() {
        if (this.cities.length < 2 || this.isSolving) return;
        
        this.isSolving = true;
        this.userPath = [];
        document.getElementById('status-text').innerText = "Comparing All...";
        document.getElementById('comparison-display').style.display = 'block';
        const tbody = document.getElementById('results-body');
        tbody.innerHTML = '<tr><td colspan="4">Calculating...</td></tr>';
        
        const results = [];
        
        // 1. Greedy
        const gStart = performance.now();
        const gRes = await this.solveGreedy(true); // Suppressed visualization
        const gTime = performance.now() - gStart;
        results.push({ name: 'Greedy', cost: gRes.cost, time: gTime, path: gRes.path });

        // 2. Brute Force (Only if <= 10)
        if (this.cities.length <= 10) {
            const bStart = performance.now();
            const bRes = await this.solveBruteForce(true);
            const bTime = performance.now() - bStart;
            results.push({ name: 'Brute Force', cost: bRes.cost, time: bTime, path: bRes.path });
        }

        // 3. DP
        const dStart = performance.now();
        const dRes = await this.solveDP();
        const dTime = performance.now() - dStart;
        results.push({ name: 'Held-Karp (DP)', cost: dRes.cost, time: dTime, path: dRes.path });

        this.displayComparison(results);
        this.isSolving = false;
        document.getElementById('status-text').innerText = "Comparison Complete";
    }

    displayComparison(results) {
        const tbody = document.getElementById('results-body');
        tbody.innerHTML = '';
        
        const minCost = Math.min(...results.map(r => r.cost));
        const bestResult = results.find(r => r.cost <= minCost + 0.01);

        results.forEach(res => {
            const isWinner = res.cost <= minCost + 0.01;
            const row = document.createElement('tr');
            if (isWinner) row.className = 'winner-row';
            
            row.innerHTML = `
                <td>${res.name}</td>
                <td style="font-family: var(--font-mono)">${res.cost.toFixed(1)}</td>
                <td style="font-family: var(--font-mono)">${res.time.toFixed(1)}ms</td>
                <td>${isWinner ? '<span class="winner-badge">Optimal</span>' : ''}</td>
            `;
            tbody.appendChild(row);
        });

        // Highlight the best path on canvas
        this.userPath = bestResult.path;
        document.getElementById('current-cost').innerText = bestResult.cost.toFixed(2);
        document.getElementById('best-cost').innerText = bestResult.cost.toFixed(2);
        document.getElementById('route-display').innerText = bestResult.path.join(" → ");
        this.render();
    }

    // --- ALGORITHMS ---

    async solveGreedy(suppressViz = false) {
        let n = this.cities.length;
        let visited = new Array(n).fill(false);
        let path = [0];
        let totalCost = 0;
        visited[0] = true;

        for (let i = 0; i < n - 1; i++) {
            let last = path[path.length - 1];
            let nearest = -1;
            let minDist = Infinity;

            for (let next = 0; next < n; next++) {
                if (!visited[next]) {
                    let d = this.getDistance(this.cities[last], this.cities[next]);
                    if (d < minDist) {
                        minDist = d;
                        nearest = next;
                    }
                }
            }

            visited[nearest] = true;
            path.push(nearest);
            totalCost += minDist;
            
            // Visualization Delay
            if (!suppressViz) {
                this.userPath = [...path];
                this.render();
                await new Promise(r => setTimeout(r, 1000 - this.visualizationSpeed * 10));
            }
        }

        totalCost += this.getDistance(this.cities[path[n - 1]], this.cities[0]);
        path.push(0);
        return { path, cost: totalCost };
    }

    async solveBruteForce(suppressViz = false) {
        let n = this.cities.length;
        let bestPath = [];
        let minCost = Infinity;

        const permute = async (arr, m = []) => {
            if (arr.length === 0) {
                let currentPath = [0, ...m, 0];
                let currentCost = 0;
                for (let i = 0; i < currentPath.length - 1; i++) {
                    currentCost += this.getDistance(this.cities[currentPath[i]], this.cities[currentPath[i+1]]);
                }
                
                if (currentCost < minCost) {
                    minCost = currentCost;
                    bestPath = currentPath;
                }
                
                // Visualization
                if (!suppressViz) {
                    this.userPath = currentPath;
                    this.render();
                    if (this.visualizationSpeed > 90) {
                        if (Math.random() > 0.95) await new Promise(r => setTimeout(r, 0));
                    } else {
                        await new Promise(r => setTimeout(r, 100 - this.visualizationSpeed));
                    }
                }
            } else {
                for (let i = 0; i < arr.length; i++) {
                    let curr = arr.slice();
                    let next = curr.splice(i, 1);
                    await permute(curr, m.concat(next));
                }
            }
        };

        let indices = Array.from({length: n-1}, (_, i) => i + 1);
        await permute(indices);
        return { path: bestPath, cost: minCost };
    }

    async solveDP() {
        let n = this.cities.length;
        const dist = Array.from({length: n}, () => new Array(n));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                dist[i][j] = this.getDistance(this.cities[i], this.cities[j]);
            }
        }

        const dp = Array.from({length: 1 << n}, () => new Array(n).fill(-1));
        const parent = Array.from({length: 1 << n}, () => new Array(n).fill(-1));

        const solve = (mask, pos) => {
            if (mask === (1 << n) - 1) {
                return dist[pos][0];
            }
            if (dp[mask][pos] !== -1) return dp[mask][pos];

            let ans = Infinity;
            for (let next = 0; next < n; next++) {
                if (!(mask & (1 << next))) {
                    let newAns = dist[pos][next] + solve(mask | (1 << next), next);
                    if (newAns < ans) {
                        ans = newAns;
                        parent[mask][pos] = next;
                    }
                }
            }
            return dp[mask][pos] = ans;
        };

        const totalCost = solve(1, 0);
        
        // Path reconstruction
        let path = [0];
        let mask = 1;
        let pos = 0;
        while (true) {
            let next = parent[mask][pos];
            if (next === -1) break;
            path.push(next);
            mask |= (1 << next);
            pos = next;
        }
        path.push(0);
        
        document.getElementById('best-cost').innerText = totalCost.toFixed(2);
        return { path, cost: totalCost };
    }

    // --- COMPLEXITY VIZ ---

    updateComplexity() {
        const n = this.cities.length;
        if (n === 0) {
            ['greedy', 'brute', 'dp'].forEach(id => {
                const el = document.getElementById(`${id}-ops`);
                if (el) el.innerText = "0";
            });
            this.renderComplexityChart(0, 0, 0);
            return;
        }

        const greedyOps = n * n;
        
        // n! calculation
        let bruteOps = 1;
        for (let i = 1; i <= n; i++) bruteOps *= i;

        // n^2 * 2^n calculation
        const dpOps = (n * n) * Math.pow(2, n);

        this.updateMetric('greedy', greedyOps);
        this.updateMetric('brute', bruteOps);
        this.updateMetric('dp', dpOps);

        this.renderComplexityChart(greedyOps, bruteOps, dpOps);
    }

    updateMetric(id, val) {
        const opsEl = document.getElementById(`${id}-ops`);
        if (!opsEl) return;

        // Human-readable operations
        const opsFormatted = this.formatOps(val);
        
        // Estimated Time (Assuming ~10M ops per second for visualization purposes)
        const timeFormatted = this.formatTime(val / 10000000);
        
        opsEl.innerHTML = `<span>${opsFormatted} ops</span> <span class="time-estimate">~${timeFormatted}</span>`;
    }

    formatOps(n) {
        if (n < 1000) return n.toString();
        if (n < 1000000) return (n / 1000).toFixed(1) + 'K';
        if (n < 1000000000) return (n / 1000000).toFixed(1) + 'M';
        if (n < 1000000000000) return (n / 1000000000).toFixed(1) + 'B';
        return (n / 1000000000000).toFixed(1) + 'T';
    }

    formatTime(seconds) {
        if (seconds < 0.001) return "< 1ms";
        if (seconds < 1) return (seconds * 1000).toFixed(0) + "ms";
        if (seconds < 60) return seconds.toFixed(1) + "s";
        if (seconds < 3600) return (seconds / 60).toFixed(1) + "m";
        if (seconds < 86400) return (seconds / 3600).toFixed(1) + "h";
        if (seconds < 31536000) return (seconds / 86400).toFixed(1) + "d";
        if (seconds < 3153600000) return (seconds / 31536000).toFixed(1) + "y";
        return "100+ years";
    }

    renderComplexityChart(greedy, brute, dp) {
        if (!this.complexityCtx) return;
        
        const ctx = this.complexityCtx;
        const w = this.complexityCanvas.width;
        const h = this.complexityCanvas.height;
        ctx.clearRect(0, 0, w, h);

        const margin = 20;
        const barHeight = 15;
        const gap = 15;
        const startY = 20;

        const values = [
            { label: 'Greedy', val: greedy, color: '#4ecdc4' },
            { label: 'Brute', val: brute, color: '#ff6b6b' },
            { label: 'DP', val: dp, color: '#fbbf24' }
        ];

        // Using Logarithmic Scale for visualization
        // Max value is roughly 15! ~= 1.3e12, but we limit Brute to 10! ~= 3.6e6
        // Let's scale based on a reasonable max for visualization
        const logMax = Math.log10(Math.max(10000000, brute, dp, greedy));
        
        values.forEach((item, i) => {
            const y = startY + (barHeight + gap) * i;
            const logVal = item.val > 0 ? Math.log10(item.val) : 0;
            const barWidth = Math.max(2, (logVal / logMax) * (w - margin * 2));

            // Draw Track
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(margin, y, w - margin * 2, barHeight);

            // Draw Bar
            ctx.fillStyle = item.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = item.color + '66';
            ctx.fillRect(margin, y, barWidth, barHeight);
            ctx.shadowBlur = 0;
            
            // Label
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, margin, y - 5);
        });
    }

    // --- RENDERING ---

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw Connections in Path
        if (this.userPath.length > 1) {
            this.ctx.beginPath();
            this.ctx.setLineDash([]);
            this.ctx.strokeStyle = this.gameMode ? '#ff6b6b' : '#4ecdc4';
            this.ctx.lineWidth = 3;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.gameMode ? 'rgba(255,107,107,0.5)' : 'rgba(78,205,196,0.5)';
            
            for (let i = 0; i < this.userPath.length - 1; i++) {
                const c1 = this.cities[this.userPath[i]];
                const c2 = this.cities[this.userPath[i+1]];
                this.ctx.moveTo(c1.x, c1.y);
                this.ctx.lineTo(c2.x, c2.y);
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }

        // Draw helper lines for potential next hub in game mode
        if (this.gameMode && this.userPath.length > 0 && this.userPath.length < this.cities.length + 1) {
            // No simple way to track mouse hover for helper lines without extra listeners,
            // so we skip for now to keep it clean.
        }

        // Draw All Connections (Ghost)
        this.ctx.beginPath();
        this.ctx.setLineDash([5, 15]);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.cities.length; i++) {
            for (let j = i + 1; j < this.cities.length; j++) {
                this.ctx.moveTo(this.cities[i].x, this.cities[i].y);
                this.ctx.lineTo(this.cities[j].x, this.cities[j].y);
            }
        }
        this.ctx.stroke();

        // Draw Cities
        this.cities.forEach((city, index) => {
            const isVisited = this.userPath.includes(index);
            const isStart = index === 0;

            this.ctx.beginPath();
            this.ctx.arc(city.x, city.y, 8, 0, Math.PI * 2);
            
            if (isStart) {
                this.ctx.fillStyle = '#ff6b6b'; // Start is reddish
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#ff6b6b';
            } else if (isVisited) {
                this.ctx.fillStyle = '#4ecdc4';
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = '#4ecdc4';
            } else {
                this.ctx.fillStyle = '#1e293b';
                this.ctx.strokeStyle = '#475569';
                this.ctx.lineWidth = 2;
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.fill();
            if (!isStart && !isVisited) this.ctx.stroke();

            // Label
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px JetBrains Mono';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(index, city.x, city.y + 22);
            this.ctx.shadowBlur = 0;
        });
    }
}

// Start Game
window.onload = () => {
    new TSPGame();
};
