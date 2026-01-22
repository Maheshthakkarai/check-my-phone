const fs = require('fs');

const masterPath = 'public/tac_master.json';
const outputPath = 'public/tac_lite.json';

try {
    const data = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
    const brands = data.brands;
    const liteMap = {};

    for (const brandName in brands) {
        const models = brands[brandName].models;
        models.forEach(modelObj => {
            const modelName = Object.keys(modelObj)[0];
            const tacs = modelObj[modelName].tacs;
            if (tacs && tacs.length > 0) {
                tacs.forEach(tac => {
                    // Only include if not already mapped or if it's a more specific name
                    liteMap[tac] = `${brandName} ${modelName}`;
                });
            }
        });
    }

    fs.writeFileSync(outputPath, JSON.stringify(liteMap));
    console.log(`Processed ${Object.keys(liteMap).length} TACs into ${outputPath}`);
} catch (err) {
    console.error('Error processing TAC database:', err);
    process.exit(1);
}
