# NeoQueue Backups

## Automatic Backups
- **Frequency:** Hourly via cron
- **Location:** `~/.config/neoqueue/neoqueue-data.json` → here
- **Retention:** Last 50 backups kept

## Manual Backup
```bash
bash ~/code/NeoQueue/backup-data.sh
```

## Restore from Backup
```bash
cp backups/neoqueue-data_YYYYMMDD_HHMMSS.json ~/.config/neoqueue/neoqueue-data.json
```

## Backup Script
See `backup-data.sh` in repo root.
