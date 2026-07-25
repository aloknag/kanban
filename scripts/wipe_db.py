import sqlite3

conn = sqlite3.connect('/data/kanban.db')
c = conn.cursor()

# Get current state before wipe
c.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = [r[0] for r in c.fetchall()]
print('Tables:', tables)

for t in tables:
    c.execute(f'SELECT count(*) FROM {t}')
    print(f'  {t}: {c.fetchone()[0]} rows')

# Wipe all data
c.execute('DELETE FROM comments')
c.execute('DELETE FROM tasks')
c.execute('DELETE FROM epics')
c.execute('DELETE FROM columns')

conn.commit()

# Verify
print('\nAfter wipe:')
for t in tables:
    c.execute(f'SELECT count(*) FROM {t}')
    print(f'  {t}: {c.fetchone()[0]} rows')

conn.close()
print('Done.')
