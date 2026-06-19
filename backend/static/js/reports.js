document.addEventListener('DOMContentLoaded', () => {
    const startInput   = document.getElementById('startDate');
    const endInput     = document.getElementById('endDate');
    const applyBtn     = document.getElementById('applyRange');
    const presetBtns   = document.querySelectorAll('.dd-preset-btn');
    const statTotal    = document.getElementById('statTotal');
    const statCount    = document.getElementById('statCount');
    const statAvg      = document.getElementById('statAvg');
    const catBody      = document.getElementById('categoryTableBody');
    const dailySub     = document.getElementById('dailyChartSub');

    let dailyChart   = null;
    let topChart     = null;

    const CHART_COLORS = [
        '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a3e635',
    ];

    // ── Date helpers ──────────────────────────────────────────────

    function toISO(d) {
        return d.toISOString().slice(0, 10);
    }

    function setPreset(days) {
        const end   = new Date();
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        startInput.value = toISO(start);
        endInput.value   = toISO(end);
    }

    function activePreset(days) {
        presetBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.days) === days));
    }

    // ── Init with 30-day default ──────────────────────────────────

    setPreset(30);
    activePreset(30);

    // ── Fetch & render ────────────────────────────────────────────

    function load() {
        const start = startInput.value;
        const end   = endInput.value;
        if (!start || !end) return;

        dailySub.textContent = `${start} to ${end}`;

        fetch(`/api/reports?start=${start}&end=${end}`)
            .then(r => {
                if (!r.ok) throw new Error('Failed to load');
                return r.json();
            })
            .then(data => {
                renderStats(data);
                renderDailyChart(data.daily);
                renderTopChart(data.top_items);
                renderCategoryTable(data.by_category, data.total_revenue);
            })
            .catch(err => {
                console.error(err);
                catBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:20px;">
                    <i class="fas fa-circle-exclamation"></i> Failed to load report data.</td></tr>`;
            });
    }

    // ── Summary stats ─────────────────────────────────────────────

    function renderStats(data) {
        statTotal.textContent = '₱' + parseFloat(data.total_revenue || 0).toFixed(2);
        statCount.textContent = data.transaction_count || 0;
        const avg = data.transaction_count
            ? (data.total_revenue / data.transaction_count)
            : 0;
        statAvg.textContent = '₱' + avg.toFixed(2);
    }

    // ── Daily revenue line chart ──────────────────────────────────

    function renderDailyChart(daily) {
        const labels = daily.map(d => d.date);
        const values = daily.map(d => d.revenue);

        if (dailyChart) { dailyChart.destroy(); }

        const ctx = document.getElementById('dailyRevenueChart').getContext('2d');
        dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue (₱)',
                    data: values,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37,99,235,0.08)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#2563eb',
                    pointRadius: labels.length > 60 ? 0 : 3,
                    fill: true,
                    tension: 0.35,
                }]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ₱' + ctx.parsed.y.toFixed(2)
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: v => '₱' + v.toLocaleString(),
                            font: { size: 11 },
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    x: {
                        ticks: {
                            font: { size: 10 },
                            maxTicksLimit: 15,
                            maxRotation: 45,
                        },
                        grid: { display: false },
                    }
                }
            }
        });
    }

    // ── Top items horizontal bar chart ────────────────────────────

    function renderTopChart(items) {
        const labels = items.map(i => i.name);
        const values = items.map(i => i.revenue);
        const colors = items.map((_, idx) => CHART_COLORS[idx % CHART_COLORS.length]);

        if (topChart) { topChart.destroy(); }

        const ctx = document.getElementById('topItemsChart').getContext('2d');
        topChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Revenue (₱)',
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ₱' + ctx.parsed.x.toFixed(2)
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: v => '₱' + v.toLocaleString(),
                            font: { size: 11 },
                        },
                        grid: { color: 'rgba(0,0,0,0.05)' },
                    },
                    y: {
                        ticks: { font: { size: 11 } },
                        grid: { display: false },
                    }
                }
            }
        });
    }

    // ── Category table ────────────────────────────────────────────

    function renderCategoryTable(categories, grandTotal) {
        catBody.innerHTML = '';
        if (!categories || !categories.length) {
            catBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">
                No data in selected period.</td></tr>`;
            return;
        }
        categories.forEach(cat => {
            const pct = grandTotal > 0 ? (cat.revenue / grandTotal * 100).toFixed(1) : '0.0';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:500;">${escHtml(cat.category)}</td>
                <td style="color:var(--text-muted);">${cat.count}</td>
                <td style="font-weight:600;color:var(--primary);">₱${parseFloat(cat.revenue).toFixed(2)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex:1;height:6px;background:var(--border);border-radius:3px;min-width:40px;">
                            <div style="width:${pct}%;height:100%;background:var(--primary);border-radius:3px;"></div>
                        </div>
                        <span style="font-size:.78rem;color:var(--text-muted);min-width:36px;text-align:right;">${pct}%</span>
                    </div>
                </td>
            `;
            catBody.appendChild(tr);
        });
    }

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    // ── Event listeners ───────────────────────────────────────────

    applyBtn.addEventListener('click', () => {
        presetBtns.forEach(b => b.classList.remove('active'));
        load();
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const days = parseInt(btn.dataset.days);
            setPreset(days);
            activePreset(days);
            load();
        });
    });

    load();
});
