-- Recursive function to migrate Automation Rules from technical to semantic terms
CREATE OR REPLACE FUNCTION migrate_automation_rules(data jsonb) 
RETURNS jsonb AS $$
DECLARE
    item jsonb;
    new_rules jsonb := '[]'::jsonb;
BEGIN
    -- If it's a RuleGroup (has match OR operator)
    IF data ? 'match' OR data ? 'operator' THEN
        -- Rename match to operator
        IF data ? 'match' THEN
            data := jsonb_set(data - 'match', '{operator}', 
                CASE 
                    WHEN data->>'match' = 'ALL' THEN '"AND"'::jsonb
                    WHEN data->>'match' = 'ANY' THEN '"OR"'::jsonb
                    ELSE data->'match' -- fallback if already renamed but value is old
                END
            );
        END IF;

        -- Ensure AND/OR values if already using 'operator' key but old 'ALL/ANY' values
        IF data ? 'operator' THEN
            data := jsonb_set(data, '{operator}',
                CASE 
                    WHEN data->>'operator' = 'ALL' THEN '"AND"'::jsonb
                    WHEN data->>'operator' = 'ANY' THEN '"OR"'::jsonb
                    ELSE data->'operator'
                END
            );
        END IF;

        -- Rename conditions to rules
        IF data ? 'conditions' THEN
            FOR item IN SELECT * FROM jsonb_array_elements(data->'conditions')
            LOOP
                new_rules := new_rules || migrate_automation_rules(item);
            END LOOP;
            data := jsonb_set(data - 'conditions', '{rules}', new_rules);
        END IF;

        -- Recurse into existing rules array
        IF data ? 'rules' AND jsonb_typeof(data->'rules') = 'array' THEN
             new_rules := '[]'::jsonb;
             FOR item IN SELECT * FROM jsonb_array_elements(data->'rules')
             LOOP
                new_rules := new_rules || migrate_automation_rules(item);
             END LOOP;
             data := jsonb_set(data, '{rules}', new_rules);
        END IF;
    END IF;

    RETURN data;
END;
$$ LANGUAGE plpgsql;

-- Execute update on the automations table
UPDATE automations 
SET rules = (
    SELECT jsonb_agg(migrate_automation_rules(r))
    FROM jsonb_array_elements(rules) r
)
WHERE rules IS NOT NULL AND jsonb_typeof(rules) = 'array';

DROP FUNCTION migrate_automation_rules(jsonb);
