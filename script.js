const inputTextArea = document.getElementById('input-textarea');
const outputTextArea = document.getElementById('output-textarea');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');

const LINE_REGEX = /^\s*([a-zA-Z0-9_*:\s]+?)\s+([a-zA-Z0-9_]+)(\[[^\]]*\])?\s*;\s*$/;

inputTextArea.addEventListener('input', generateCode);

function getPrefix(type, isArray) {
    if (type.includes('string')) return 'CL_';
    if (type.includes('char') && isArray) return 'pscL_';
    if (type.includes('char') && !isArray) return 'scL_';
    if (type.includes('int')) return 'siL_';
    if (type.includes('long')) return 'slL_';
    if (type.includes('bool')) return 'bL_';
    if (type.includes('float')) return 'fL_';
    if (type.includes('double')) return 'dL_';
    return '_';
}

function parseLine(line) {
    const match = line.match(LINE_REGEX);
    if (!match) return null;

    let rawType = match[1].trim();
    rawType = rawType.replace(/\s+/g, ' ');

    const varName = match[2];
    const arrayBounds = match[3] || '';
    const isArray = arrayBounds.length > 0;

    const lastUnderscoreIndex = varName.lastIndexOf('_');
    let baseName = varName;
    if (lastUnderscoreIndex !== -1 && lastUnderscoreIndex < varName.length - 1) {
        baseName = varName.substring(lastUnderscoreIndex + 1);
    }
    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

    const prefix = getPrefix(rawType, isArray);
    const paramName = `${prefix}${baseName}`;

    return { rawType, varName, isArray, baseName, paramName };
}

function generateCode() {
    const text = inputTextArea.value;
    const lines = text.split('\n');
    let setters = [];
    let getters = [];
    let initLines = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        const parsed = parseLine(line);
        if (!parsed) return;

        const { rawType, varName, isArray, baseName, paramName } = parsed;
        const paramType = rawType;

        // Setter Generation
        let setterBody = '';
        if (rawType.includes('char') && isArray) {
            setterBody = `strcpy(${varName}, ${paramName});`;
        } else {
            setterBody = `${varName} = ${paramName};`;
        }
        setters.push(`void mcfn_set${baseName}(const ${paramType}& ${paramName}) { ${setterBody} }`);

        // Getter Generation — fix: use const char* return type for char arrays
        let getterReturnType = paramType;
        if (rawType.includes('char') && isArray) {
            getterReturnType = 'char*';
        }
        getters.push(`${getterReturnType} mcfn_get${baseName}() const { return ${varName}; }`);

        // Init Generation
        if (rawType.includes('string')) {
            initLines.push(`    ${varName}.clear();`);
        } else if (rawType.includes('char') && isArray) {
            initLines.push(`    ${varName}[0] = 0x00;`);
        } else {
            initLines.push(`    ${varName} = 0x00;`);
        }
    });

    if (setters.length === 0 && getters.length === 0) {
        outputTextArea.value = '';
        return;
    }

    let outputParts = [];
    if (setters.length > 0) outputParts.push(setters.join('\n'));
    if (getters.length > 0) outputParts.push(getters.join('\n'));

    if (initLines.length > 0) {
        const initMethod = `void mcfn_initilize()\n{\n${initLines.join('\n')}\n}`;
        outputParts.push(initMethod);
    }

    outputTextArea.value = outputParts.join('\n\n');
}

copyBtn.addEventListener('click', async () => {
    const textToCopy = outputTextArea.value;
    if (!textToCopy) return;
    try {
        await navigator.clipboard.writeText(textToCopy);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
});

// Run once on load in case textarea is pre-filled
generateCode();
