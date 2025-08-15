import {
    openDB,
    addProject,
    getProjects,
    deleteProject,
    addEntry,
    getEntries,
    updateEntry,
    deleteEntry,
    addExpense,
    getExpenses,
    updateExpense,
    deleteExpense,
    addOutbound,
    getOutbounds,
    updateOutbound,
    deleteOutbound
} from './db.js';

let currentProjectId = null;
let currentProjectName = null;
let currentDate = null;


document.addEventListener('DOMContentLoaded', async () => {
    await openDB();
    setupEventListeners();
    showProjectListPage();
});

// Expose functions to global scope for HTML onclick events
window.editEntryRecord = editEntryRecord;
window.editExpenseRecord = editExpenseRecord;
window.deleteRecord = deleteRecord;
window.deleteDateRecords = deleteDateRecords;
window.showDailyDetailsPage = showDailyDetailsPage;
window.showOutboundModal = showOutboundModal;
window.editOutboundRecord = editOutboundRecord;

function setupEventListeners() {
    // Page navigation
    document.getElementById('new-project-btn').addEventListener('click', handleNewProject);
    // Unified back button
    document.getElementById('back-btn').addEventListener('click', handleBackButton);

    // FAB buttons on Daily Details Page
    document.getElementById('add-entry-btn').addEventListener('click', () => {
        loadEntryFormMemory();
        showModal('add-entry-modal');
    });
    document.getElementById('add-expense-btn').addEventListener('click', () => {
        showModal('add-expense-modal');
    });

    // Add by Date on Project Page
    document.getElementById('add-by-date-btn').addEventListener('click', () => {
        const selectedDate = document.getElementById('add-by-date-input').value;
        if (selectedDate) {
            showDailyDetailsPage(selectedDate);
        } else {
            alert('请选择一个日期');
        }
    });

    // Modal forms
    document.getElementById('add-entry-form').addEventListener('submit', handleEntryFormSubmit);
    document.getElementById('add-expense-form').addEventListener('submit', handleExpenseFormSubmit);
    document.getElementById('add-outbound-form').addEventListener('submit', handleOutboundFormSubmit);

    // Modal cancel buttons
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', () => hideModal(btn.closest('.modal').id));
    });
}

// --- Page Rendering ---

function handleBackButton() {
    const currentPage = document.querySelector('main > div:not(.hidden)');
    if (currentPage.id === 'project-page') {
        showProjectListPage();
    } else if (currentPage.id === 'daily-details-page') {
        showProjectPage(currentProjectId, currentProjectName);
    }
}

async function showProjectListPage() {
    navigateTo('project-list-page');
    document.getElementById('main-title').textContent = '📋 项目管理中心';
    document.getElementById('back-btn').classList.add('hidden');
    const projects = await getProjects();
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';

    if (projects.length === 0) {
        projectList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                <h3>暂无项目</h3>
                <p>点击下方按钮创建您的第一个项目</p>
            </div>
        `;
        return;
    }

    for (const project of projects) {
        const entries = await getEntries(project.id);
        const expenses = await getExpenses(project.id);
        const outbounds = await getOutbounds(project.id);

        const totalItems = entries.reduce((sum, entry) => sum + Number(entry.count), 0);
        const totalWeight = entries.reduce((sum, entry) => sum + Number(entry.totalWeight), 0);
        const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.totalAmount), 0);
        const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
        
        // Calculate outbound totals
        const outboundItems = outbounds.reduce((sum, outbound) => sum + Number(outbound.count), 0);
        const outboundWeight = outbounds.reduce((sum, outbound) => sum + Number(outbound.totalWeight), 0);
        const outboundAmount = outbounds.reduce((sum, outbound) => sum + Number(outbound.totalAmount), 0);
        
        // Calculate current stock
        const currentItems = totalItems - outboundItems;
        const currentWeight = totalWeight - outboundWeight;
        const currentValue = totalAmount - outboundAmount;
        
        // Check if project has outbound records
        const hasOutbounds = outbounds.length > 0;
        
        // Calculate profit/loss
        const netProfit = outboundAmount - totalExpense;
        const profitClass = netProfit >= 0 ? 'profit-positive' : 'profit-negative';
        const profitIcon = netProfit >= 0 ? '📈' : '📉';
        
        // Get latest activity date
        const allDates = [...entries.map(e => e.date), ...expenses.map(e => e.date), ...outbounds.map(o => o.date)];
        const latestDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => new Date(d)))).toLocaleDateString('zh-CN') : '无记录';

        const li = document.createElement('li');
        // Add different class based on whether project has outbounds
        li.className = hasOutbounds ? 'project-with-outbound' : 'project-entry-only';
        li.innerHTML = `
            <div class="project-content">
                <div class="project-header">
                    <h3>${hasOutbounds ? '🔄' : '📦'} ${project.name}</h3>
                    <span class="project-status">${hasOutbounds ? '已出库' : '仅入库'}</span>
                </div>
                
                <div class="project-stats">
                    <div class="stat-group">
                        <div class="stat-item">
                            <span class="stat-label">📦 入库</span>
                            <span class="stat-value">${totalItems.toLocaleString()}件 / ${Math.floor(totalWeight)}斤</span>
                            <span class="stat-amount">¥${Math.floor(totalAmount).toLocaleString()}</span>
                        </div>
                        
                        ${hasOutbounds ? `
                        <div class="stat-item">
                            <span class="stat-label">📤 出库</span>
                            <span class="stat-value">${outboundItems.toLocaleString()}件 / ${Math.floor(outboundWeight)}斤</span>
                            <span class="stat-amount">¥${Math.floor(outboundAmount).toLocaleString()}</span>
                        </div>
                        ` : ''}
                        
                        <div class="stat-item">
                            <span class="stat-label">📊 当前库存</span>
                            <span class="stat-value">${currentItems.toLocaleString()}件 / ${Math.floor(currentWeight)}斤</span>
                            <span class="stat-amount">¥${Math.floor(currentValue).toLocaleString()}</span>
                        </div>
                        
                        <div class="stat-item">
                            <span class="stat-label">💰 总支出</span>
                            <span class="stat-amount">¥${Math.floor(totalExpense).toLocaleString()}</span>
                        </div>
                        
                        ${hasOutbounds ? `
                        <div class="stat-item ${profitClass}">
                            <span class="stat-label">${profitIcon} 净收益</span>
                            <span class="stat-amount">¥${Math.floor(netProfit).toLocaleString()}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="project-meta">
                        <span class="last-activity">🕒 最近活动: ${latestDate}</span>
                    </div>
                </div>
            </div>
            <div class="project-controls">
                <button class="delete-project-btn" data-project-id="${project.id}" title="删除项目">🗑️</button>
            </div>
        `;
        
        // Add click event for project content (not the delete button)
        const projectContent = li.querySelector('.project-content');
        projectContent.addEventListener('click', () => showProjectPage(project.id, project.name));
        
        // Add click event for delete button
        const deleteBtn = li.querySelector('.delete-project-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent project click event
            handleDeleteProject(project.id, project.name);
        });
        
        projectList.appendChild(li);
    }
}

async function showProjectPage(projectId, projectName) {
    currentProjectId = projectId;
    currentProjectName = projectName;
    navigateTo('project-page');

    document.getElementById('project-name').textContent = projectName;
    document.getElementById('main-title').textContent = projectName;
    document.getElementById('back-btn').classList.remove('hidden');
    document.getElementById('back-btn').textContent = '← 返回项目列表';

    const entries = await getEntries(projectId);
    const expenses = await getExpenses(projectId);
    const outbounds = await getOutbounds(projectId);

    // Project summary
    const totalItems = entries.reduce((sum, entry) => sum + Number(entry.count), 0);
    const totalWeight = entries.reduce((sum, entry) => sum + Number(entry.totalWeight), 0);
    const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.totalAmount), 0);
    
    // Calculate outbound totals
    const totalOutboundItems = outbounds.reduce((sum, outbound) => sum + Number(outbound.count), 0);
    const totalOutboundWeight = outbounds.reduce((sum, outbound) => sum + Number(outbound.totalWeight), 0);
    const totalOutboundAmount = outbounds.reduce((sum, outbound) => sum + Number(outbound.totalAmount), 0);
    
    // Calculate current stock
    const currentStockItems = totalItems - totalOutboundItems;
    const currentStockWeight = totalWeight - totalOutboundWeight;
    const currentStockValue = totalAmount - totalOutboundAmount;
    
    const expenseByType = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
    }, {});
    const totalExpense = Object.values(expenseByType).reduce((sum, amount) => sum + amount, 0);

    document.getElementById('project-summary').innerHTML = `
        <div class="summary-section">
            <h3>📦 入库汇总</h3>
            <p>累计件数: <span class="summary-value">${totalItems.toLocaleString()}</span></p>
            <p>累计斤数: <span class="summary-value">${Math.floor(totalWeight)}</span></p>
            <p>累计入库金额: <span class="summary-value">¥${Math.floor(totalAmount).toLocaleString()}</span></p>
        </div>
        
        <div class="summary-section">
            <h3>📤 出库汇总</h3>
            <p>累计出库件数: <span class="summary-value">${totalOutboundItems.toLocaleString()}</span></p>
            <p>累计出库斤数: <span class="summary-value">${Math.floor(totalOutboundWeight)}</span></p>
            <p>累计出库金额: <span class="summary-value">¥${Math.floor(totalOutboundAmount).toLocaleString()}</span></p>
        </div>
        
        <div class="summary-section current-stock">
            <h3>📊 当前库存</h3>
            <p>库存件数: <strong>${currentStockItems.toLocaleString()}</strong></p>
            <p>库存斤数: <strong>${Math.floor(currentStockWeight)}</strong></p>
            <p>库存价值: <strong>¥${Math.floor(currentStockValue).toLocaleString()}</strong></p>
            <button onclick="showOutboundModal()" class="btn-primary">➕ 添加出库记录</button>
        </div>
        
        <div class="summary-section">
            <h3>💰 费用汇总</h3>
            <p>👷 人工费: <span class="summary-value">¥${Math.floor(expenseByType['人工费'] || 0).toLocaleString()}</span></p>
<p>📋 代办费: <span class="summary-value">¥${Math.floor(expenseByType['代办费'] || 0).toLocaleString()}</span></p>
<p>🚛 装车费: <span class="summary-value">¥${Math.floor(expenseByType['装车费'] || 0).toLocaleString()}</span></p>
<p>🍽️ 吃饭费用: <span class="summary-value">¥${Math.floor(expenseByType['吃饭费用'] || 0).toLocaleString()}</span></p>
<p>⛽ 加油费用: <span class="summary-value">¥${Math.floor(expenseByType['加油费用'] || 0).toLocaleString()}</span></p>
<p>🚗 车费: <span class="summary-value">¥${Math.floor(expenseByType['车费'] || 0).toLocaleString()}</span></p>
<p><strong>总支出: ¥${Math.floor(totalExpense).toLocaleString()}</strong></p>
        </div>
    `;

    // Group records by date
    const recordsByDate = {};
    [...entries, ...expenses, ...outbounds].forEach(record => {
        const date = record.date;
        if (!recordsByDate[date]) {
            recordsByDate[date] = { entries: [], expenses: [], outbounds: [] };
        }
        if (record.itemName && !record.hasOwnProperty('isOutbound')) { // It's an entry
            recordsByDate[date].entries.push(record);
        } else if (record.itemName && record.hasOwnProperty('isOutbound')) { // It's an outbound
            recordsByDate[date].outbounds.push(record);
        } else { // It's an expense
            recordsByDate[date].expenses.push(record);
        }
    });

    const dateList = document.getElementById('date-list');
    dateList.innerHTML = '';
    const sortedDates = Object.keys(recordsByDate).sort((a, b) => new Date(b) - new Date(a));

    for (const date of sortedDates) {
        const dayRecords = recordsByDate[date];
        const dayTotalItems = dayRecords.entries.reduce((sum, entry) => sum + Number(entry.count), 0);
        const dayTotalWeight = dayRecords.entries.reduce((sum, entry) => sum + Number(entry.totalWeight), 0);
        const dayTotalAmount = dayRecords.entries.reduce((sum, entry) => sum + Number(entry.totalAmount), 0);
        const dayTotalExpense = dayRecords.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
        
        const dayOutboundItems = dayRecords.outbounds.reduce((sum, outbound) => sum + Number(outbound.count), 0);
        const dayOutboundWeight = dayRecords.outbounds.reduce((sum, outbound) => sum + Number(outbound.totalWeight), 0);
        const dayOutboundAmount = dayRecords.outbounds.reduce((sum, outbound) => sum + Number(outbound.totalAmount), 0);

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="date-item-content" onclick="showDailyDetailsPage('${date}')">
                <h4>${date}</h4>
                <p>入库: ${dayTotalItems}件, ${dayTotalWeight.toFixed(2)}斤, ${dayTotalAmount.toFixed(2)}元</p>
                <p>出库: ${dayOutboundItems}件, ${dayOutboundWeight.toFixed(2)}斤, ${dayOutboundAmount.toFixed(2)}元</p>
                <p>支出: ${dayTotalExpense.toFixed(2)}元</p>
            </div>
            <button class="delete-date-btn" onclick="deleteDateRecords('${date}')" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 10px;">删除</button>
        `;
        dateList.appendChild(li);
    }
}

async function showDailyDetailsPage(date) {
    currentDate = date;
    navigateTo('daily-details-page');

    // Format date for display
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('date-header').textContent = formattedDate;
    document.getElementById('main-title').textContent = formattedDate;
    document.getElementById('back-btn').classList.remove('hidden');
    document.getElementById('back-btn').textContent = '← 返回项目首页';

    const entries = await getEntries(currentProjectId, date);
    const expenses = await getExpenses(currentProjectId, date);
    const outbounds = await getOutbounds(currentProjectId, date);

    // Daily summary
    const dayTotalItems = entries.reduce((sum, entry) => sum + Number(entry.count), 0);
    const dayTotalWeight = entries.reduce((sum, entry) => sum + Number(entry.totalWeight), 0);
    const dayTotalAmount = entries.reduce((sum, entry) => sum + Number(entry.totalAmount), 0);
    
    const dayOutboundItems = outbounds.reduce((sum, outbound) => sum + Number(outbound.count), 0);
    const dayOutboundWeight = outbounds.reduce((sum, outbound) => sum + Number(outbound.totalWeight), 0);
    const dayOutboundAmount = outbounds.reduce((sum, outbound) => sum + Number(outbound.totalAmount), 0);
    
    const expenseByType = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
    }, {});
    const dayTotalExpense = Object.values(expenseByType).reduce((sum, amount) => sum + amount, 0);

    // Build expense details for summary
    let expenseDetails = '';
    if (expenses.length > 0) {
        // Group expenses by category for better display
        const categoryIcons = {
            '人工费': '👷',
            '代办费': '📋',
            '装车费': '🚛',
            '吃饭费用': '🍽️',
            '加油费用': '⛽',
            '车费': '🚗'
        };
        
        const expenseByCategory = expenses.reduce((acc, expense) => {
            if (!acc[expense.category]) {
                acc[expense.category] = [];
            }
            acc[expense.category].push(expense);
            return acc;
        }, {});
        
        expenseDetails = Object.entries(expenseByCategory).map(([category, categoryExpenses]) => {
            const icon = categoryIcons[category] || '💰';
            const categoryTotal = categoryExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
            const details = categoryExpenses.map(exp => 
                exp.remarks ? `<small style="color: #666; font-style: italic;">  └ ${exp.remarks}</small>` : ''
            ).filter(detail => detail).join('<br>');
            
            return `<p>${icon} ${category}: <span class="summary-value">¥${Math.floor(categoryTotal).toLocaleString()}</span>${details ? '<br>' + details : ''}</p>`;
        }).join('');
    } else {
        expenseDetails = '<p style="color: #999; font-style: italic;">📝 无费用记录</p>';
    }

    document.getElementById('daily-summary').innerHTML = `
        <div class="summary-section">
            <h3>📦 当日入库</h3>
            <p>总件数: <span class="summary-value">${dayTotalItems.toLocaleString()}</span></p>
            <p>总斤数: <span class="summary-value">${Math.floor(dayTotalWeight)}</span></p>
            <p>总入库金额: <span class="summary-value">¥${Math.floor(dayTotalAmount).toLocaleString()}</span></p>
        </div>
        
        <div class="summary-section">
            <h3>📤 当日出库</h3>
            <p>总件数: <span class="summary-value">${dayOutboundItems.toLocaleString()}</span></p>
            <p>总斤数: <span class="summary-value">${Math.floor(dayOutboundWeight)}</span></p>
            <p>总出库金额: <span class="summary-value">¥${Math.floor(dayOutboundAmount).toLocaleString()}</span></p>
        </div>
        
        <div class="summary-section">
            <h3>💰 当日费用</h3>
            ${expenseDetails}
            <p style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee;"><strong>总支出: ¥${Math.floor(dayTotalExpense).toLocaleString()}</strong></p>
        </div>
    `;

    // Entry records list
    const entryRecordsList = document.getElementById('entry-records-list');
    entryRecordsList.innerHTML = '';

    if (entries.length === 0) {
        entryRecordsList.innerHTML = '<p>无入库记录</p>';
    } else {
        entries.forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${entry.itemName}</strong><br>
                件数: ${entry.count}, 单件重量: ${entry.weight}斤, 单价: ${entry.price}元/斤<br>
                总斤数: ${Math.floor(entry.totalWeight)}, 总金额: ${Math.floor(entry.totalAmount)}元<br>
                姓名: ${entry.personName || ''}, 身份证号: ${entry.idCard || ''}, 电话: ${entry.phone || ''}<br>
                备注: ${entry.remarks || ''}<br>
                <small style="color: #666;">ID: ${entry.id}</small><br>
                <div class="record-actions" style="margin-top: 10px;">
                    <button class="edit-btn" onclick="editEntryRecord(${entry.id})" style="background: #FFC107; color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 3px; cursor: pointer;">✏️ 修改</button>
                    <button class="delete-btn" onclick="deleteRecord(${entry.id}, 'entry')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️ 删除</button>
                </div>
            `;
            entryRecordsList.appendChild(li);
        });
    }

    // Expense records list
    const expenseRecordsList = document.getElementById('expense-records-list');
    expenseRecordsList.innerHTML = '';

    if (expenses.length === 0) {
        expenseRecordsList.innerHTML = '<p>无费用记录</p>';
    } else {
        expenses.forEach(expense => {
            const li = document.createElement('li');
            li.className = 'expense-record-card';
            
            li.innerHTML = `
                <div class="expense-header">
                    <strong>${expense.category}:</strong> ${Math.floor(expense.amount)}元
                </div>
                ${expense.remarks ? `<div class="expense-remarks">备注: ${expense.remarks}</div>` : ''}
                <div class="record-actions" style="margin-top: 10px;">
                    <button class="edit-btn" onclick="editExpenseRecord(${expense.id})" style="background: #FFC107; color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 3px; cursor: pointer;">✏️ 修改</button>
                    <button class="delete-btn" onclick="deleteRecord(${expense.id}, 'expense')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️ 删除</button>
                </div>
            `;
            expenseRecordsList.appendChild(li);
        });
    }

    // Outbound records list
    const outboundRecordsList = document.getElementById('outbound-records-list');
    outboundRecordsList.innerHTML = '';

    if (outbounds.length === 0) {
        outboundRecordsList.innerHTML = '<p>无出库记录</p>';
    } else {
        outbounds.forEach(outbound => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${outbound.itemName}</strong><br>
                件数: ${outbound.count}, 单件重量: ${outbound.weight}斤, 单价: ${outbound.price}元/斤<br>
                总斤数: ${Math.floor(outbound.totalWeight)}, 总金额: ${Math.floor(outbound.totalAmount)}元<br>
                买方: ${outbound.buyer || ''}, 电话: ${outbound.buyerPhone || ''}<br>
                备注: ${outbound.remarks || ''}<br>
                <small style="color: #666;">ID: ${outbound.id}</small><br>
                <div class="record-actions" style="margin-top: 10px;">
                    <button class="edit-btn" onclick="editOutboundRecord(${outbound.id})" style="background: #FFC107; color: white; border: none; padding: 5px 10px; margin-right: 5px; border-radius: 3px; cursor: pointer;">✏️ 修改</button>
                    <button class="delete-btn" onclick="deleteRecord(${outbound.id}, 'outbound')" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️ 删除</button>
                </div>
            `;
            outboundRecordsList.appendChild(li);
        });
    }
}


// --- Event Handlers & Data Logic ---

function handleNewProject() {
    // Create a custom input dialog since prompt() is not supported
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.border = '2px solid #ccc';
    dialog.style.borderRadius = '8px';
    dialog.style.padding = '20px';
    dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    dialog.style.zIndex = '1000';
    dialog.style.minWidth = '300px';
    
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '999';
    
    const title = document.createElement('h3');
    title.textContent = '创建新项目';
    title.style.margin = '0 0 15px 0';
    title.style.color = '#333';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '请输入项目名称';
    input.style.width = '100%';
    input.style.padding = '10px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.fontSize = '16px';
    input.style.marginBottom = '15px';
    input.style.boxSizing = 'border-box';
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.textAlign = 'right';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '取消';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.marginRight = '10px';
    cancelBtn.style.border = '1px solid #ccc';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.backgroundColor = '#f5f5f5';
    cancelBtn.style.cursor = 'pointer';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确定';
    confirmBtn.style.padding = '8px 16px';
    confirmBtn.style.border = 'none';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.backgroundColor = '#007bff';
    confirmBtn.style.color = 'white';
    confirmBtn.style.cursor = 'pointer';
    
    function closeDialog() {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    }
    
    cancelBtn.addEventListener('click', closeDialog);
    overlay.addEventListener('click', closeDialog);
    
    confirmBtn.addEventListener('click', () => {
        const projectName = input.value.trim();
        if (projectName !== '') {
            closeDialog();
            addProject(projectName).then(() => {
                showProjectListPage();
            }).catch(error => {
                console.error('Error adding project:', error);
                alert('创建项目失败: ' + error.message);
            });
        } else {
            alert('请输入项目名称');
            input.focus();
        }
    });
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmBtn.click();
        } else if (e.key === 'Escape') {
            closeDialog();
        }
    });
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(confirmBtn);
    
    dialog.appendChild(title);
    dialog.appendChild(input);
    dialog.appendChild(buttonContainer);
    
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
    
    input.focus();
}

async function handleDeleteProject(projectId, projectName) {
    if (confirm(`确定要删除项目 "${projectName}" 吗？\n\n注意：这将删除该项目下的所有入库记录和费用记录，此操作不可撤销！`)) {
        try {
            await deleteProject(projectId);
            alert('项目删除成功！');
            showProjectListPage(); // Refresh the project list
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('删除项目失败: ' + error.message);
        }
    }
}

async function handleEntryFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const entryId = form.elements['entry-id'].value; // Check for an ID

    const count = parseFloat(form.elements['item-count'].value) || 0;
    const weight = parseFloat(form.elements['item-weight'].value) || 0;
    const price = parseFloat(form.elements['item-price'].value) || 0;

    if (!currentDate) {
        alert('请先选择一个日期页面');
        return;
    }

    const recordData = {
        projectId: currentProjectId,
        date: currentDate,
        itemName: form.elements['item-name'].value,
        count: count,
        weight: weight,
        price: price,
        totalWeight: count * weight,
        totalAmount: count * weight * price,
        remarks: form.elements['item-remarks'].value,
        personName: form.elements['item-name-person'].value,
        idCard: form.elements['item-id-card'].value,
        phone: form.elements['item-phone'].value
    };

    // Save form data to memory for new entries
    if (!entryId) {
        saveEntryFormMemory({
            itemName: recordData.itemName,
            weight: weight,
            price: price,
            personName: recordData.personName,
            idCard: recordData.idCard,
            phone: recordData.phone
        });
    }

    try {
        if (entryId) {
            recordData.id = parseInt(entryId, 10);
            await updateEntry(recordData);
            console.log('Entry updated:', recordData);
        } else {
            const newId = await addEntry(recordData);
            console.log('New entry added with ID:', newId);
        }

        hideModal('add-entry-modal');
        showDailyDetailsPage(currentDate);
    } catch (error) {
        console.error('Error saving entry:', error);
        alert('保存失败: ' + error.message);
    }
}

async function handleExpenseFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const expenseId = form.elements['expense-id'].value;
    const date = currentDate;

    if (!date) {
        alert('请选择一个日期');
        return;
    }

    if (expenseId) {
        // If we have an ID, it means we are editing a single expense category.
        const allExpenses = await getExpenses(currentProjectId, date);
        const originalRecord = allExpenses.find(exp => exp.id === parseInt(expenseId, 10));
        const category = originalRecord.category;
        let amount = 0;
        let remarks = '';

        if (category === '人工费') {
            amount = form.elements['labor-cost'].value;
            remarks = form.elements['labor-remarks'].value;
        } else if (category === '代办费') {
            amount = form.elements['agency-cost'].value;
            remarks = form.elements['agency-remarks'].value;
        } else if (category === '装车费') {
            amount = form.elements['loading-cost'].value;
            remarks = form.elements['loading-remarks'].value;
        } else if (category === '吃饭费用') {
            amount = form.elements['meal-cost'].value;
            remarks = form.elements['meal-remarks'].value;
        } else if (category === '加油费用') {
            amount = form.elements['fuel-cost'].value;
            remarks = form.elements['fuel-remarks'].value;
        } else if (category === '车费') {
            amount = form.elements['transport-cost'].value;
            remarks = form.elements['transport-remarks'].value;
        }

        if (amount && Number(amount) > 0) {
            const updatedExpense = {
                id: parseInt(expenseId, 10),
                projectId: currentProjectId,
                date: date,
                category: category,
                amount: Number(amount),
                remarks: remarks || ''
            };
            await updateExpense(updatedExpense);
        } else {
            // If amount is 0 or empty, delete the record
            await deleteExpense(parseInt(expenseId, 10));
        }
    } else {
        // Adding new records
        const expenseCategories = [
            { category: '人工费', amount: form.elements['labor-cost'].value, remarks: form.elements['labor-remarks'].value },
            { category: '代办费', amount: form.elements['agency-cost'].value, remarks: form.elements['agency-remarks'].value },
            { category: '装车费', amount: form.elements['loading-cost'].value, remarks: form.elements['loading-remarks'].value },
            { category: '吃饭费用', amount: form.elements['meal-cost'].value, remarks: form.elements['meal-remarks'].value },
            { category: '加油费用', amount: form.elements['fuel-cost'].value, remarks: form.elements['fuel-remarks'].value },
            { category: '车费', amount: form.elements['transport-cost'].value, remarks: form.elements['transport-remarks'].value }
        ];

        for (const expenseData of expenseCategories) {
            if (expenseData.amount && Number(expenseData.amount) > 0) {
                const newExpense = {
                    projectId: currentProjectId,
                    date: date,
                    category: expenseData.category,
                    amount: Number(expenseData.amount),
                    remarks: expenseData.remarks || ''
                };
                await addExpense(newExpense);
            }
        }
    }

    hideModal('add-expense-modal');
    showDailyDetailsPage(date);
}

// addContextMenu函数已被移除，现在使用直接的按钮方式

async function editEntryRecord(entryId) {
    console.log('editEntryRecord called with ID:', entryId);
    try {
        // Get all entries for current project and date
        const entries = await getEntries(currentProjectId, currentDate);
        const record = entries.find(entry => entry.id === entryId);
        
        if (!record) {
            alert('找不到要编辑的记录');
            return;
        }
        
        const form = document.getElementById('add-entry-form');
        form.reset();
        
        form.elements['entry-id'].value = record.id;
        form.elements['item-name'].value = record.itemName;
        form.elements['item-count'].value = record.count;
        form.elements['item-weight'].value = record.weight;
        form.elements['item-price'].value = record.price;
        form.elements['item-remarks'].value = record.remarks || '';
        form.elements['item-name-person'].value = record.personName || '';
        form.elements['item-id-card'].value = record.idCard || '';
        form.elements['item-phone'].value = record.phone || '';
        console.log('Entry form populated, showing modal');
        showModal('add-entry-modal');
    } catch (error) {
        console.error('Error in editEntryRecord:', error);
        alert('编辑失败: ' + error.message);
    }
}

async function editExpenseRecord(expenseId) {
    console.log('editExpenseRecord called with ID:', expenseId);
    try {
        // Get all expenses for current project and date
        const expenses = await getExpenses(currentProjectId, currentDate);
        const record = expenses.find(expense => expense.id === expenseId);
        
        if (!record) {
            alert('找不到要编辑的记录');
            return;
        }
        
        const form = document.getElementById('add-expense-form');
        form.reset();
        
        form.elements['expense-id'].value = record.id;
        
        // Clear all fields first
        form.elements['labor-cost'].value = '';
        form.elements['labor-remarks'].value = '';
        form.elements['agency-cost'].value = '';
        form.elements['agency-remarks'].value = '';
        form.elements['loading-cost'].value = '';
        form.elements['loading-remarks'].value = '';
        form.elements['meal-cost'].value = '';
        form.elements['meal-remarks'].value = '';
        form.elements['fuel-cost'].value = '';
        form.elements['fuel-remarks'].value = '';
        form.elements['transport-cost'].value = '';
        form.elements['transport-remarks'].value = '';
        
        // Populate the specific category field
        if (record.category === '人工费') {
            form.elements['labor-cost'].value = record.amount;
            form.elements['labor-remarks'].value = record.remarks || '';
        } else if (record.category === '代办费') {
            form.elements['agency-cost'].value = record.amount;
            form.elements['agency-remarks'].value = record.remarks || '';
        } else if (record.category === '装车费') {
            form.elements['loading-cost'].value = record.amount;
            form.elements['loading-remarks'].value = record.remarks || '';
        } else if (record.category === '吃饭费用') {
            form.elements['meal-cost'].value = record.amount;
            form.elements['meal-remarks'].value = record.remarks || '';
        } else if (record.category === '加油费用') {
            form.elements['fuel-cost'].value = record.amount;
            form.elements['fuel-remarks'].value = record.remarks || '';
        } else if (record.category === '车费') {
            form.elements['transport-cost'].value = record.amount;
            form.elements['transport-remarks'].value = record.remarks || '';
        }
        
        console.log('Expense form populated, showing modal');
        showModal('add-expense-modal');
    } catch (error) {
        console.error('Error in editExpenseRecord:', error);
        alert('编辑失败: ' + error.message);
    }
}

async function deleteRecord(id, type) {
    console.log('deleteRecord called with:', { id, type, currentDate });
    console.log('ID type:', typeof id, 'ID value:', id);
    
    if (confirm('确定要删除这条记录吗?')) {
        try {
            // Convert id to number if it's a string
            const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
            console.log('Converted ID:', numericId, 'type:', typeof numericId);
            
            if (type === 'entry') {
                console.log('Deleting entry with id:', numericId);
                await deleteEntry(numericId);
                console.log('Entry deleted successfully');
            } else if (type === 'expense') {
                console.log('Deleting expense with id:', numericId);
                await deleteExpense(numericId);
                console.log('Expense deleted successfully');
            } else if (type === 'outbound') {
                console.log('Deleting outbound with id:', numericId);
                await deleteOutbound(numericId);
                console.log('Outbound deleted successfully');
            }
            console.log('Refreshing page with date:', currentDate);
            showDailyDetailsPage(currentDate);
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('删除失败: ' + error.message);
        }
    }
}

async function deleteDateRecords(date) {
    console.log('deleteDateRecords called with date:', date);
    
    if (confirm(`确定要删除 ${date} 的所有记录吗？此操作不可撤销。`)) {
        try {
            // Get all entries, expenses and outbounds for this date
            const entries = await getEntries(currentProjectId, date);
            const expenses = await getExpenses(currentProjectId, date);
            const outbounds = await getOutbounds(currentProjectId, date);
            
            console.log(`Found ${entries.length} entries, ${expenses.length} expenses and ${outbounds.length} outbounds for date ${date}`);
            
            // Delete all entries for this date
            for (const entry of entries) {
                await deleteEntry(entry.id);
                console.log('Deleted entry:', entry.id);
            }
            
            // Delete all expenses for this date
            for (const expense of expenses) {
                await deleteExpense(expense.id);
                console.log('Deleted expense:', expense.id);
            }
            
            // Delete all outbounds for this date
            for (const outbound of outbounds) {
                await deleteOutbound(outbound.id);
                console.log('Deleted outbound:', outbound.id);
            }
            
            console.log(`Successfully deleted all records for date ${date}`);
            alert(`已成功删除 ${date} 的所有记录`);
            
            // Refresh the project page
            showProjectPage(currentProjectId, currentProjectName);
        } catch (error) {
            console.error('Error deleting date records:', error);
            alert('删除失败: ' + error.message);
        }
    }
}


// --- UI Helpers ---

function navigateTo(pageId) {
    document.querySelectorAll('main > div').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    const form = modal.querySelector('form');
    form.reset();
    
    // Clear hidden ID fields
    if (modalId === 'add-entry-modal') {
        form.elements['entry-id'].value = '';
    } else if (modalId === 'add-expense-modal') {
        form.elements['expense-id'].value = '';
    }
}

// Entry Form Memory Functions
function saveEntryFormMemory(data) {
    localStorage.setItem('entryFormMemory', JSON.stringify(data));
}

function loadEntryFormMemory() {
    // Only load memory if not editing an existing record
    const form = document.getElementById('add-entry-form');
    if (form.elements['entry-id'].value) return;
    
    const savedData = localStorage.getItem('entryFormMemory');
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            const form = document.getElementById('add-entry-form');
            
            if (data.itemName) form.elements['item-name'].value = data.itemName;
            if (data.weight) form.elements['item-weight'].value = data.weight;
            if (data.price) form.elements['item-price'].value = data.price;
            if (data.personName) form.elements['item-name-person'].value = data.personName;
            if (data.idCard) form.elements['item-id-card'].value = data.idCard;
            if (data.phone) form.elements['item-phone'].value = data.phone;
        } catch (e) {
            console.error('Failed to load entry form memory:', e);
        }
    }
}

function clearEntryFormMemory() {
    localStorage.removeItem('entryFormData');
}

// --- Outbound Functions ---

function showOutboundModal() {
    // Clear form
    document.getElementById('add-outbound-form').reset();
    document.getElementById('outbound-id').value = '';
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('outbound-date').value = today;
    
    // Reset manual input flags
    const weightInput = document.getElementById('outbound-weight');
    const priceInput = document.getElementById('outbound-price');
    weightInput.dataset.manualInput = 'false';
    priceInput.dataset.manualInput = 'false';
    
    // Add event listeners
    const itemNameInput = document.getElementById('outbound-item-name');
    itemNameInput.removeEventListener('input', handleOutboundItemNameChange);
    itemNameInput.addEventListener('input', handleOutboundItemNameChange);
    
    // Track manual input for weight and price
    weightInput.removeEventListener('input', handleManualWeightInput);
    weightInput.addEventListener('input', handleManualWeightInput);
    priceInput.removeEventListener('input', handleManualPriceInput);
    priceInput.addEventListener('input', handleManualPriceInput);
    
    showModal('add-outbound-modal');
}

// Track manual input for weight
function handleManualWeightInput(event) {
    event.target.dataset.manualInput = 'true';
}

// Track manual input for price
function handleManualPriceInput(event) {
    event.target.dataset.manualInput = 'true';
}

// Function to handle item name change and auto-fill weight and price
async function handleOutboundItemNameChange(event) {
    const itemName = event.target.value.trim();
    const weightInput = document.getElementById('outbound-weight');
    const priceInput = document.getElementById('outbound-price');
    
    // Only auto-fill if not manually entered and fields are empty
    const weightManualInput = weightInput.dataset.manualInput === 'true';
    const priceManualInput = priceInput.dataset.manualInput === 'true';
    
    if (itemName && (!weightInput.value || !weightManualInput) && (!priceInput.value || !priceManualInput)) {
        try {
            // 只搜索当前项目下的入库记录
            const entries = await getEntries(currentProjectId);
            
            // 在当前项目的入库记录中查找匹配的物品名称
            const matchingEntry = entries
                .filter(entry => {
                    // 确保只在当前项目的数据中搜索
                    return entry.projectId === currentProjectId && 
                           entry.itemName && 
                           entry.itemName.toLowerCase().includes(itemName.toLowerCase());
                })
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            
            if (matchingEntry) {
                console.log(`找到匹配的入库记录: ${matchingEntry.itemName} (项目ID: ${matchingEntry.projectId})`);
                
                // Auto-fill weight if not manually entered
                if (!weightManualInput) {
                    weightInput.value = matchingEntry.weight;
                    weightInput.style.backgroundColor = '#e8f5e8';
                    setTimeout(() => {
                        weightInput.style.backgroundColor = '';
                    }, 2000);
                }
                
                // Auto-fill price if not manually entered
                if (!priceManualInput) {
                    priceInput.value = matchingEntry.price;
                    priceInput.style.backgroundColor = '#e8f5e8';
                    setTimeout(() => {
                        priceInput.style.backgroundColor = '';
                    }, 2000);
                }
            } else {
                console.log(`在当前项目(ID: ${currentProjectId})中未找到匹配的物品名称: ${itemName}`);
            }
        } catch (error) {
            console.error('Error fetching entries for auto-fill:', error);
        }
    }
}

async function handleOutboundFormSubmit(event) {
    event.preventDefault();
    
    const outboundId = document.getElementById('outbound-id').value;
    const date = document.getElementById('outbound-date').value || new Date().toISOString().split('T')[0];
    const itemName = document.getElementById('outbound-item-name').value || '未指定物品';
    const count = parseFloat(document.getElementById('outbound-count').value);
    const weight = parseFloat(document.getElementById('outbound-weight').value) || 0;
    const price = parseFloat(document.getElementById('outbound-price').value) || 0;
    const buyer = document.getElementById('outbound-buyer').value;
    const buyerPhone = document.getElementById('outbound-buyer-phone').value;
    const remarks = document.getElementById('outbound-remarks').value;
    
    // 验证必填字段
    if (!count || count <= 0) {
        alert('请输入有效的出库件数');
        return;
    }
    
    const totalWeight = count * weight;
    const totalAmount = totalWeight * price;
    
    const outboundData = {
        projectId: currentProjectId,
        date,
        itemName,
        count,
        weight,
        price,
        totalWeight,
        totalAmount,
        buyer,
        buyerPhone,
        remarks,
        isOutbound: true
    };
    
    try {
        if (outboundId) {
            // Update existing outbound
            outboundData.id = parseInt(outboundId);
            await updateOutbound(outboundData);
        } else {
            // Add new outbound
            await addOutbound(outboundData);
        }
        
        hideModal('add-outbound-modal');
        
        // 强制刷新当前页面数据
        console.log('出库记录保存成功，开始刷新页面数据');
        console.log('currentDate:', currentDate);
        console.log('currentProjectId:', currentProjectId);
        
        // 直接刷新，不依赖页面检测
        if (currentDate) {
            console.log('刷新每日详情页面');
            showDailyDetailsPage(currentDate);
        } else if (currentProjectId) {
            console.log('刷新项目主页');
            showProjectPage(currentProjectId, currentProjectName);
        } else {
            console.log('无法确定当前页面，刷新项目列表');
            showProjectListPage();
        }
    } catch (error) {
        console.error('Error saving outbound record:', error);
        alert('保存出库记录时出错');
    }
}

async function editOutboundRecord(outboundId) {
    try {
        const outbounds = await getOutbounds(currentProjectId);
        const outbound = outbounds.find(o => o.id === outboundId);
        
        if (outbound) {
            document.getElementById('outbound-id').value = outbound.id;
            document.getElementById('outbound-date').value = outbound.date;
            document.getElementById('outbound-item-name').value = outbound.itemName;
            document.getElementById('outbound-count').value = outbound.count;
            document.getElementById('outbound-weight').value = outbound.weight;
            document.getElementById('outbound-price').value = outbound.price;
            document.getElementById('outbound-buyer').value = outbound.buyer || '';
            document.getElementById('outbound-buyer-phone').value = outbound.buyerPhone || '';
            document.getElementById('outbound-remarks').value = outbound.remarks || '';
            
            // Set manual input flags to true since these are existing values
            const weightInput = document.getElementById('outbound-weight');
            const priceInput = document.getElementById('outbound-price');
            weightInput.dataset.manualInput = 'true';
            priceInput.dataset.manualInput = 'true';
            
            // Add event listeners for editing mode
            const itemNameInput = document.getElementById('outbound-item-name');
            itemNameInput.removeEventListener('input', handleOutboundItemNameChange);
            itemNameInput.addEventListener('input', handleOutboundItemNameChange);
            
            // Track manual input for weight and price
            weightInput.removeEventListener('input', handleManualWeightInput);
            weightInput.addEventListener('input', handleManualWeightInput);
            priceInput.removeEventListener('input', handleManualPriceInput);
            priceInput.addEventListener('input', handleManualPriceInput);
            
            showModal('add-outbound-modal');
        }
    } catch (error) {
        console.error('Error loading outbound record:', error);
        alert('加载出库记录时出错');
    }
}