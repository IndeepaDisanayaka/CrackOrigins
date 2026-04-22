
import fs from 'fs';

const filePath = 'd:/javaScript/ai/crackorigins-v2/lib/admin-actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace isOwner checks with hasPermission checks
const replacements = [
    {
        target: 'if (!userDoc.exists || !userDoc.data()?.isOwner) {\n            return { success: false, error: "Unauthorized." };\n        }',
        replacement: 'const userData = userDoc.data();\n        const canWrite = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, \'games\', \'WRITE\'));\n        if (!userDoc.exists || !canWrite) {\n            return { success: false, error: "Unauthorized." };\n        }'
    },
    {
        target: 'if (!userDoc.exists || !userDoc.data()?.isOwner) {\n            return { success: false, error: "Unauthorized." };\n        }',
        replacement: 'const userData = userDoc.data();\n        const canWrite = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, \'offers\', \'WRITE\'));\n        if (!userDoc.exists || !canWrite) {\n            return { success: false, error: "Unauthorized." };\n        }'
    }
];

// Note: Replacing like this is tricky if the target is identical.
// I'll do it more carefully in the next step.
console.log('Script ready');
