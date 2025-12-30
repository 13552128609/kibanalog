function stringifyObject(obj, indent = 0, visited = new Set()) {
    const spacing = ' '.repeat(indent);
    let result = '';

    if (obj === null) {
        return `${spacing}null\n`;
    }

    const type = typeof obj;

    // BigInt
    if (type === 'bigint') {
        return `${spacing}${obj.toString()}n\n`;
    }

    // 基础类型
    if (type !== 'object' && type !== 'function') {
        // 对于 Symbol 和 Function，默认 toString() 行为通常是可接受的
        return `${spacing}${obj}\n`;
    }

    // 防止循环引用
    if (visited.has(obj)) {
        return `${spacing}[Circular Reference]\n`;
    }
    const newVisited = new Set(visited);
    newVisited.add(obj);

    // Map
    if (obj instanceof Map) {
        result += `${spacing}Map(${obj.size}) {\n`;
        for (const [key, value] of obj.entries()) {
            // 🔑 关键修改：Map的键不进行递归stringify，而是使用 String(key)
            result += `${spacing}  ${String(key)} => `;
            // 值为递归调用，使用 newVisited 集合
            result += stringifyObject(value, indent + 4, newVisited);
        }
        result += `${spacing}}\n`;
        return result;
    }

    // Set
    if (obj instanceof Set) {
        result += `${spacing}Set(${obj.size}) [\n`;
        for (const value of obj.values()) {
            // 值为递归调用，使用 newVisited 集合
            result += stringifyObject(value, indent + 4, newVisited);
        }
        result += `${spacing}]\n`;
        return result;
    }

    // Array
    if (Array.isArray(obj)) {
        result += `${spacing}[\n`;
        for (const value of obj) {
            // 值为递归调用，使用 newVisited 集合
            result += stringifyObject(value, indent + 2, newVisited);
        }
        result += `${spacing}]\n`;
        return result;
    }

    // 普通对象
    result += `${spacing}{\n`;
    for (const [key, value] of Object.entries(obj)) {
        // 键为字符串，值为递归调用，使用 newVisited 集合
        result += `${spacing}  ${key}: `;
        result += stringifyObject(value, indent + 4, newVisited);
    }
    result += `${spacing}}\n`;

    return result;
}


async function makeRequestWithRetry(url, data, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await axios.post(url, data, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000 // 10 second timeout
            });
            return response;
        } catch (error) {
            lastError = error;
            if (error.response && error.response.status < 500) {
                // Don't retry for 4xx errors
                throw error;
            }
            if (i < maxRetries - 1) {
                console.log(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

module.exports = {
    stringifyObject,
    makeRequestWithRetry
};