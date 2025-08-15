const DB_NAME = 'local-app-db';
const DB_VERSION = 3; // Incremented version for outbound records
let db;

export function openDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject('Database error');
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            const transaction = event.target.transaction;

            if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
            }

            let entriesStore;
            if (!db.objectStoreNames.contains('entries')) {
                entriesStore = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
            } else {
                entriesStore = transaction.objectStore('entries');
            }

            if (!entriesStore.indexNames.contains('projectId')) {
                entriesStore.createIndex('projectId', 'projectId', { unique: false });
            }
            if (!entriesStore.indexNames.contains('date')) {
                entriesStore.createIndex('date', 'date', { unique: false });
            }

            // No need to explicitly add columns for remarks, personName, idCard, phone
            // IndexedDB is schemaless, they will be saved with the object.

            if (!db.objectStoreNames.contains('expenses')) {
                const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
                expensesStore.createIndex('projectId', 'projectId', { unique: false });
                expensesStore.createIndex('date', 'date', { unique: false });
            }

            // Create outbound records table
            if (!db.objectStoreNames.contains('outbounds')) {
                const outboundsStore = db.createObjectStore('outbounds', { keyPath: 'id', autoIncrement: true });
                outboundsStore.createIndex('projectId', 'projectId', { unique: false });
                outboundsStore.createIndex('date', 'date', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
    });
}

// Project functions
export function addProject(name) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        const request = store.add({ name });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getProjects() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function deleteProject(projectId) {
    return new Promise(async (resolve, reject) => {
        try {
            // Delete all entries for this project
            const entries = await getEntries(projectId);
            for (const entry of entries) {
                await deleteEntry(entry.id);
            }
            
            // Delete all expenses for this project
            const expenses = await getExpenses(projectId);
            for (const expense of expenses) {
                await deleteExpense(expense.id);
            }
            
            // Delete all outbounds for this project
            const outbounds = await getOutbounds(projectId);
            for (const outbound of outbounds) {
                await deleteOutbound(outbound.id);
            }
            
            // Delete the project itself
            const transaction = db.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.delete(projectId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

// Entry functions
export function addEntry(entry) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        const request = store.add(entry);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ... other functions for entries (get, update, delete)
export function getEntries(projectId, date) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['entries'], 'readonly');
        const store = transaction.objectStore('entries');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            if (date) {
                resolve(request.result.filter(entry => entry.date === date));
            } else {
                resolve(request.result);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

export function updateEntry(entry) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        const request = store.put(entry);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function deleteEntry(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['entries'], 'readwrite');
        const store = transaction.objectStore('entries');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


// Expense functions
export function addExpense(expense) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.add(expense);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ... other functions for expenses (get, update, delete)
export function getExpenses(projectId, date) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readonly');
        const store = transaction.objectStore('expenses');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            if (date) {
                resolve(request.result.filter(expense => expense.date === date));
            } else {
                resolve(request.result);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

export function updateExpense(expense) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.put(expense);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function deleteExpense(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['expenses'], 'readwrite');
        const store = transaction.objectStore('expenses');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Outbound records functions
export function addOutbound(outbound) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['outbounds'], 'readwrite');
        const store = transaction.objectStore('outbounds');
        const request = store.add(outbound);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getOutbounds(projectId, date) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['outbounds'], 'readonly');
        const store = transaction.objectStore('outbounds');
        const index = store.index('projectId');
        const request = index.getAll(projectId);

        request.onsuccess = () => {
            let outbounds = request.result;
            if (date) {
                outbounds = outbounds.filter(outbound => outbound.date === date);
            }
            resolve(outbounds);
        };
        request.onerror = () => reject(request.error);
    });
}

export function updateOutbound(outbound) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['outbounds'], 'readwrite');
        const store = transaction.objectStore('outbounds');
        const request = store.put(outbound);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export function deleteOutbound(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['outbounds'], 'readwrite');
        const store = transaction.objectStore('outbounds');
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}