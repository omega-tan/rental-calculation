<canvas id="cashflow-chart" width="600" height="400"></canvas>

// 全局變量
let cashflowChart = null;
let annualChart = null;
let machinesChart = null;

// DOM 元素
const monthlyShipmentSlider = document.getElementById('monthly-shipment');
const shipmentValueSpan = document.getElementById('shipment-value');
const rentalPriceInput = document.getElementById('rental-price');
const fixedCostInput = document.getElementById('fixed-cost');
const unitCostInput = document.getElementById('unit-cost');
const analysisMonthsInput = document.getElementById('analysis-months');
const taxRateInput = document.getElementById('tax-rate');

// 結果顯示元素
const breakevenTimeElement = document.getElementById('breakeven-time');
const requiredCapitalElement = document.getElementById('required-capital');
const netProfitElement = document.getElementById('net-profit');
const totalTaxElement = document.getElementById('total-tax');
const roiElement = document.getElementById('roi');
const annualTbody = document.getElementById('annual-tbody');
const monthlyTbody = document.getElementById('monthly-tbody');

// 業務常數
const MACHINE_REPLACEMENT_CYCLE = 48; // 48個月更換機器
const RENTAL_REDUCTION_MONTH = 61; // 61個月後租金減半
const RENTAL_REDUCTION_RATE = 0.5; // 租金減半

// 數字格式化函數
function formatNumber(num) {
    return new Intl.NumberFormat('zh-TW').format(Math.round(num));
}

function formatCurrency(num) {
    return `MYR ${formatNumber(num)}`;
}

function formatPercentage(num) {
    return `${num.toFixed(1)}%`;
}

// 機器狀態管理類
class MachineTracker {
    constructor() {
        this.machines = []; // 每台機器的記錄 {startMonth, currentAge}
    }

    addMachines(count, currentMonth) {
        for (let i = 0; i < count; i++) {
            this.machines.push({
                startMonth: currentMonth,
                currentAge: 0
            });
        }
    }

    updateMonth(currentMonth) {
        // 更新所有機器的年齡
        this.machines.forEach(machine => {
            machine.currentAge = currentMonth - machine.startMonth + 1;
        });

        // 檢查需要更換的機器
        const machinesToReplace = this.machines.filter(machine => 
            machine.currentAge >= MACHINE_REPLACEMENT_CYCLE && 
            machine.currentAge % MACHINE_REPLACEMENT_CYCLE === 0
        );

        return machinesToReplace.length;
    }

    getMachineStats() {
        const fullRentalCount = this.machines.filter(machine => 
            machine.currentAge < RENTAL_REDUCTION_MONTH
        ).length;
        
        const halfRentalCount = this.machines.filter(machine => 
            machine.currentAge >= RENTAL_REDUCTION_MONTH
        ).length;

        return {
            total: this.machines.length,
            fullRental: fullRentalCount,
            halfRental: halfRentalCount
        };
    }

    getTotalMachines() {
        return this.machines.length;
    }
}

// 計算完整的財務分析
function calculateAdvancedFinancials() {
    const monthlyShipment = parseInt(monthlyShipmentSlider.value);
    const rentalPrice = parseFloat(rentalPriceInput.value) || 0;
    const fixedCost = parseFloat(fixedCostInput.value) || 0;
    const unitCost = parseFloat(unitCostInput.value) || 0;
    const totalMonths = parseInt(analysisMonthsInput.value) || 120;
    const taxRate = parseFloat(taxRateInput.value) || 20;

    const machineTracker = new MachineTracker();
    const monthlyData = [];
    const annualData = [];
    
    let cumulativeCashFlow = 0;
    let cumulativeTaxPaid = 0;
    let breakevenMonth = null;
    let maxNegativeCashFlow = 0;

    // 按月計算
    for (let month = 1; month <= totalMonths; month++) {
        // 新增機器
        machineTracker.addMachines(monthlyShipment, month);

        // 更新機器狀態並檢查需要更換的機器數量
        const replacementCount = machineTracker.updateMonth(month);
        
        // 獲取機器統計
        const machineStats = machineTracker.getMachineStats();
        
        // 計算當月收入（全額租金 + 半額租金）
        const monthlyIncome = (machineStats.fullRental * rentalPrice) + 
                             (machineStats.halfRental * rentalPrice * RENTAL_REDUCTION_RATE);
        
        // 計算當月成本（固定成本 + 新機器成本 + 更換機器成本）
        const newMachineCost = monthlyShipment * unitCost;
        const replacementCost = replacementCount * unitCost;
        const monthlyCost = fixedCost + newMachineCost + replacementCost;
        
        // 當月淨現金流
        const monthlyNetCashFlow = monthlyIncome - monthlyCost;
        cumulativeCashFlow += monthlyNetCashFlow;
        
        // 記錄最大負現金流
        if (cumulativeCashFlow < maxNegativeCashFlow) {
            maxNegativeCashFlow = cumulativeCashFlow;
        }
        
        // 記錄回本月份
        if (breakevenMonth === null && cumulativeCashFlow > 0) {
            breakevenMonth = month;
        }
        
        monthlyData.push({
            month,
            machineCount: machineStats.total,
            fullRentalMachines: machineStats.fullRental,
            halfRentalMachines: machineStats.halfRental,
            monthlyIncome,
            monthlyCost,
            newMachineCost,
            replacementCost,
            monthlyNetCashFlow,
            cumulativeCashFlow,
            replacements: replacementCount
        });
    }

    // 計算年度數據和稅務
    const totalYears = Math.ceil(totalMonths / 12);
    let cumulativeProfitAfterTax = 0;

    for (let year = 1; year <= totalYears; year++) {
        const startMonth = (year - 1) * 12;
        const endMonth = Math.min(year * 12, totalMonths);
        
        let yearlyIncome = 0;
        let yearlyCost = 0;
        
        // 計算年度收入和成本
        for (let i = startMonth; i < endMonth; i++) {
            if (monthlyData[i]) {
                yearlyIncome += monthlyData[i].monthlyIncome;
                yearlyCost += monthlyData[i].monthlyCost;
            }
        }
        
        const yearlyProfitBeforeTax = yearlyIncome - yearlyCost;
        
        // 計算稅務（只對正利潤徵稅）
        const yearlyTax = yearlyProfitBeforeTax > 0 ? yearlyProfitBeforeTax * (taxRate / 100) : 0;
        const yearlyProfitAfterTax = yearlyProfitBeforeTax - yearlyTax;
        
        cumulativeTaxPaid += yearlyTax;
        cumulativeProfitAfterTax += yearlyProfitAfterTax;
        
        annualData.push({
            year,
            yearlyIncome,
            yearlyCost,
            yearlyProfitBeforeTax,
            yearlyTax,
            yearlyProfitAfterTax,
            cumulativeProfitAfterTax
        });
    }

    const requiredCapital = Math.abs(maxNegativeCashFlow);
    const finalNetProfit = cumulativeProfitAfterTax;
    const roi = requiredCapital > 0 ? (finalNetProfit / requiredCapital) * 100 : 0;

    return {
        monthlyData,
        annualData,
        breakevenMonth,
        requiredCapital,
        finalNetProfit,
        cumulativeTaxPaid,
        roi,
        totalMonths,
        params: {
            monthlyShipment,
            rentalPrice,
            fixedCost,
            unitCost,
            taxRate
        }
    };
}

// 更新關鍵指標顯示
function updateMetrics(results) {
    const { breakevenMonth, requiredCapital, finalNetProfit, cumulativeTaxPaid, roi } = results;
    
    // 回本時間
    if (breakevenMonth) {
        breakevenTimeElement.textContent = `${breakevenMonth} 個月`;
        breakevenTimeElement.className = 'metric-value breakeven-good';
    } else {
        breakevenTimeElement.textContent = '無法回本';
        breakevenTimeElement.className = 'metric-value breakeven-never';
    }
    
    // 所需資本
    requiredCapitalElement.textContent = formatCurrency(requiredCapital);
    
    // 最終淨利潤（稅後）
    netProfitElement.textContent = formatCurrency(finalNetProfit);
    netProfitElement.className = finalNetProfit >= 0 ? 'metric-value profit-positive' : 'metric-value profit-negative';
    
    // 累計繳稅金額
    totalTaxElement.textContent = formatCurrency(cumulativeTaxPaid);
    
    // 投資回報率
    roiElement.textContent = formatPercentage(roi);
    roiElement.className = roi >= 0 ? 'metric-value profit-positive' : 'metric-value profit-negative';
}

// 更新累積現金流圖表
function updateCashflowChart(results) {
    const { monthlyData } = results;
    
    const labels = monthlyData.map(data => `第${data.month}月`);
    const cashflowBeforeTax = monthlyData.map(data => data.cumulativeCashFlow);
    
    // 計算稅後累積現金流（簡化計算）
    let cumulativeTaxEffect = 0;
    const cashflowAfterTax = monthlyData.map((data, index) => {
        const yearIndex = Math.floor(index / 12);
        if (results.annualData[yearIndex]) {
            const annualTaxRate = results.annualData[yearIndex].yearlyTax / Math.max(results.annualData[yearIndex].yearlyProfitBeforeTax, 1);
            if (data.cumulativeCashFlow > 0) {
                cumulativeTaxEffect += data.monthlyNetCashFlow * annualTaxRate / 12;
            }
        }
        return data.cumulativeCashFlow - cumulativeTaxEffect;
    });
    
    const ctx = document.getElementById('cashflow-chart').getContext('2d');
    
    if (cashflowChart) {
        cashflowChart.destroy();
    }
    
    cashflowChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '累積現金流 (稅前)',
                    data: cashflowBeforeTax,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4
                },
                {
                    label: '累積現金流 (稅後)',
                    data: cashflowAfterTax,
                    borderColor: '#FFC185',
                    backgroundColor: 'rgba(255, 193, 133, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        maxTicksLimit: 12
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 更新年度盈虧圖表
function updateAnnualChart(results) {
    const { annualData } = results;
    
    const labels = annualData.map(data => `第${data.year}年`);
    const revenues = annualData.map(data => data.yearlyIncome);
    const costs = annualData.map(data => data.yearlyCost);
    const profitsBeforeTax = annualData.map(data => data.yearlyProfitBeforeTax);
    const profitsAfterTax = annualData.map(data => data.yearlyProfitAfterTax);
    
    const ctx = document.getElementById('annual-chart').getContext('2d');
    
    if (annualChart) {
        annualChart.destroy();
    }
    
    annualChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '年度收入',
                    data: revenues,
                    backgroundColor: '#1FB8CD',
                    borderColor: '#1FB8CD',
                    borderWidth: 1
                },
                {
                    label: '年度成本',
                    data: costs,
                    backgroundColor: '#B4413C',
                    borderColor: '#B4413C',
                    borderWidth: 1
                },
                {
                    label: '利潤 (稅前)',
                    data: profitsBeforeTax,
                    backgroundColor: '#FFC185',
                    borderColor: '#FFC185',
                    borderWidth: 1
                },
                {
                    label: '利潤 (稅後)',
                    data: profitsAfterTax,
                    backgroundColor: '#5D878F',
                    borderColor: '#5D878F',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 更新機器數量圖表
function updateMachinesChart(results) {
    const { monthlyData } = results;
    
    const labels = monthlyData.map(data => `第${data.month}月`);
    const totalMachines = monthlyData.map(data => data.machineCount);
    const fullRentalMachines = monthlyData.map(data => data.fullRentalMachines);
    const halfRentalMachines = monthlyData.map(data => data.halfRentalMachines);
    
    const ctx = document.getElementById('machines-chart').getContext('2d');
    
    if (machinesChart) {
        machinesChart.destroy();
    }
    
    machinesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '總機器數量',
                    data: totalMachines,
                    borderColor: '#1FB8CD',
                    backgroundColor: 'rgba(31, 184, 205, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: '全額租金機器',
                    data: fullRentalMachines,
                    borderColor: '#FFC185',
                    backgroundColor: 'rgba(255, 193, 133, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: '半額租金機器',
                    data: halfRentalMachines,
                    borderColor: '#B4413C',
                    backgroundColor: 'rgba(180, 65, 60, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        maxTicksLimit: 12
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 更新年度盈虧表格
function updateAnnualTable(results) {
    const { annualData } = results;
    
    annualTbody.innerHTML = '';
    
    annualData.forEach(data => {
        const row = document.createElement('tr');
        const profitClass = data.yearlyProfitAfterTax >= 0 ? 'positive' : 'negative';
        const rowClass = data.yearlyProfitAfterTax >= 0 ? 'profit-row positive' : 'profit-row negative';
        
        row.className = rowClass;
        row.innerHTML = `
            <td>第${data.year}年</td>
            <td>${formatCurrency(data.yearlyIncome)}</td>
            <td>${formatCurrency(data.yearlyCost)}</td>
            <td class="${data.yearlyProfitBeforeTax >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.yearlyProfitBeforeTax)}</td>
            <td class="tax-cell">${formatCurrency(data.yearlyTax)}</td>
            <td class="${profitClass} annual-profit-cell">${formatCurrency(data.yearlyProfitAfterTax)}</td>
            <td class="${data.cumulativeProfitAfterTax >= 0 ? 'positive' : 'negative'} annual-profit-cell">${formatCurrency(data.cumulativeProfitAfterTax)}</td>
        `;
        annualTbody.appendChild(row);
    });
}

// 更新月度詳細表格（前36個月）
function updateMonthlyTable(results) {
    const { monthlyData } = results;
    
    monthlyTbody.innerHTML = '';
    
    const maxMonths = Math.min(36, monthlyData.length);
    
    for (let i = 0; i < maxMonths; i++) {
        const data = monthlyData[i];
        const row = document.createElement('tr');
        
        let specialInfo = '';
        if (data.replacements > 0) {
            specialInfo = `<span class="machine-change replacement">更換${data.replacements}台</span>`;
        }
        
        row.innerHTML = `
            <td>第${data.month}月${specialInfo}</td>
            <td>${data.machineCount} <small>(全租:${data.fullRentalMachines}, 半租:${data.halfRentalMachines})</small></td>
            <td>${formatCurrency(data.monthlyIncome)}</td>
            <td>${formatCurrency(data.monthlyCost)}</td>
            <td class="${data.monthlyNetCashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.monthlyNetCashFlow)}</td>
            <td class="${data.cumulativeCashFlow >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.cumulativeCashFlow)}</td>
        `;
        monthlyTbody.appendChild(row);
    }
}

// Tab 切換功能
function initializeTabs() {
    // 圖表 Tab 切換
    const chartTabs = document.querySelectorAll('.tab-btn');
    const chartContents = document.querySelectorAll('.tab-content');
    
    chartTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // 移除所有活動狀態
            chartTabs.forEach(t => t.classList.remove('active'));
            chartContents.forEach(c => c.classList.remove('active'));
            
            // 添加活動狀態
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // 強制重新繪製對應的圖表
            setTimeout(() => {
                if (targetTab === 'cashflow' && cashflowChart) {
                    cashflowChart.resize();
                } else if (targetTab === 'annual' && annualChart) {
                    annualChart.resize();
                } else if (targetTab === 'machines' && machinesChart) {
                    machinesChart.resize();
                }
            }, 100);
        });
    });
    
    // 表格 Tab 切換
    const tableTabs = document.querySelectorAll('.table-tab-btn');
    const tableContents = document.querySelectorAll('.table-tab-content');
    
    tableTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // 移除所有活動狀態
            tableTabs.forEach(t => t.classList.remove('active'));
            tableContents.forEach(c => c.classList.remove('active'));
            
            // 添加活動狀態
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab + '-tab');
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// 更新所有結果
function updateResults() {
    const results = calculateAdvancedFinancials();
    
    updateMetrics(results);
    updateCashflowChart(results);
    updateAnnualChart(results);
    updateMachinesChart(results);
    updateAnnualTable(results);
    updateMonthlyTable(results);
}

// 事件監聽器
monthlyShipmentSlider.addEventListener('input', function() {
    shipmentValueSpan.textContent = this.value;
    updateResults();
});

rentalPriceInput.addEventListener('input', updateResults);
fixedCostInput.addEventListener('input', updateResults);
unitCostInput.addEventListener('input', updateResults);
analysisMonthsInput.addEventListener('input', updateResults);
taxRateInput.addEventListener('input', updateResults);

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 設置初始滑動條顯示值
    shipmentValueSpan.textContent = monthlyShipmentSlider.value;
    
    // 初始化 Tab 功能
    initializeTabs();
    
    // 首次計算和顯示結果
    updateResults();
    
    // 添加輸入驗證
    const numberInputs = [rentalPriceInput, fixedCostInput, unitCostInput, analysisMonthsInput, taxRateInput];
    
    numberInputs.forEach(input => {
        input.addEventListener('blur', function() {
            const value = parseFloat(this.value);
            if (isNaN(value) || value < 0) {
                this.value = this.getAttribute('value'); // 恢復原值
                updateResults();
            }
        });
    });
    

    // 添加鍵盤事件處理
    numberInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                this.blur();
            }
        });
    });
});

// 窗口調整大小時重新繪製圖表
window.addEventListener('resize', function() {
    if (cashflowChart) {
        cashflowChart.resize();
    }
    if (annualChart) {
        annualChart.resize();
    }
    if (machinesChart) {
        machinesChart.resize();
    }
});
