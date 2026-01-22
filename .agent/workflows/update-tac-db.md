---
description: Refresh the TAC database from Osmocom and generate the lite mapping file.
---

1. Download the latest master TAC database from Osmocom.
// turbo
2. run_command: `curl -o public/tac_master.json http://tacdb.osmocom.org/export/tacdb.json`

3. Run the processing script to generate the lite version.
// turbo
4. run_command: `node scripts/process_tac.js`

5. Cleanup the large master file.
// turbo
6. run_command: `cmd /c del public\tac_master.json`
