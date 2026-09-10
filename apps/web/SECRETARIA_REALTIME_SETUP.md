# Secretaria Realtime Setup Guide

## Overview
The Igreja Secretaria module now implements Supabase Realtime to provide immediate, live data updates across all users.

### How it works
1. **SharedDataContext**: Wraps the entire Secretaria module. It holds the central state for all common tables (`igreja_membros`, `igreja_funcoes`, `cargos_igreja`, etc.).
2. **useSecretariaRealtime Hook**: Connects to Supabase channels and listens for `postgres_changes`.
3. **Automatic Refresh**: Whenever an `INSERT`, `UPDATE`, or `DELETE` occurs, the local state is instantly updated, ensuring all users view identical data.
4. **Visual Indicators**: A real-time connection status (Conectado / Sincronizando... / Desconectado) is displayed in the global Header when inside the Secretaria module.

### Testing Realtime Synchronization
To test the real-time feature:
1. Open the application in two different browsers (or incognito mode) with different users.
2. Navigate to `Igreja > Secretaria > Cadastros > Membros`.
3. Create, edit, or delete a member in one window.
4. Watch the other window automatically update the table without page refreshes.

### Troubleshooting Connection Issues
- **Status is stuck on "Desconectado"**: Verify your network connection and ensure Supabase `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct.
- **Data not syncing**: Ensure Supabase Replication is enabled for the targeted tables in your Supabase Dashboard (`Database > Replication > Toggle tables`).
- **Permissions Error**: The RLS policies have been updated to allow shared access for users accessing the module. If blocked, check `auth.uid()` requirements.

### Performance Considerations
- We fetch the initial payload once and only react to deltas via the Realtime websocket.
- The `SharedDataContext` minimizes unnecessary API calls from individual consultation components.