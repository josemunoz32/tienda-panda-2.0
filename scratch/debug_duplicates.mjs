import fs from 'fs';
import path from 'path';

// 1. Read owned folders
const ownedFolders = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scratch/owned_folders.json'), 'utf8'));

// Standardize normalization: strip spaces, punctuation, special symbols, accents
function cleanStrict(str) {
  return (str || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '');
}

// 2. Build set of owned keys AND key words
const ownedCleanSet = new Set(ownedFolders.map(f => cleanStrict(f)));

// Print sample owned games for context
console.log("OWNED SAMPLES:", ownedFolders.slice(0, 20));

// Read candidates list
const candidateList = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scratch/recommended_150.json'), 'utf8'));

const duplicatesFound = [];
for (const cand of candidateList) {
  const cClean = cleanStrict(cand);
  // Check exact match or partial folder matches
  for (const owned of ownedFolders) {
    const oClean = cleanStrict(owned);
    if (cClean === oClean || (cClean.length > 5 && oClean.includes(cClean)) || (oClean.length > 5 && cClean.includes(oClean))) {
      duplicatesFound.push({ candidate: cand, matchedOwned: owned });
      break;
    }
  }
}

console.log("DUPLICATES DETECTED IN LAST 150 LIST:", duplicatesFound.length);
console.log(duplicatesFound);
