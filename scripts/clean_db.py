import sqlite3
conn = sqlite3.connect('/data/kanban.db')
c = conn.cursor()
c.execute('DELETE FROM columns WHERE id IN (4,5,6,7)')
c.execute("UPDATE tasks SET title='Assignee Test' WHERE id=119 AND title=''")
conn.commit()
c.execute('SELECT id,name,position FROM columns ORDER BY position')
print(c.fetchall())
conn.close()
