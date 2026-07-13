-- Stock movements are an audit ledger. Keep this forward-fix migration irreversible
-- to avoid deleting inventory history during local repair flows.
select 1;
