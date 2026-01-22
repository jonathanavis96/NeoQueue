#!/usr/bin/env bash
# NeoQueue data backup script
set -euo pipefail

BACKUP_DIR="$HOME/code/NeoQueue/backups"
DATA_FILE="$HOME/.config/neoqueue/neoqueue-data.json"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_BACKUPS=50  # Keep last 50 backups

mkdir -p "$BACKUP_DIR"

if [[ -f "$DATA_FILE" ]]; then
    cp "$DATA_FILE" "$BACKUP_DIR/neoqueue-data_${TIMESTAMP}.json"
    echo "Backup created: neoqueue-data_${TIMESTAMP}.json"
    
    # Cleanup old backups (keep last MAX_BACKUPS)
    cd "$BACKUP_DIR"
    ls -t neoqueue-data_*.json 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -f
else
    echo "WARNING: Data file not found at $DATA_FILE"
fi
