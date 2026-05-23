export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS extraction_log (
    id            VARCHAR   PRIMARY KEY,
    user_id       VARCHAR   NOT NULL,
    conversation  TEXT      NOT NULL,
    extracted_at  DATE      NOT NULL,
    entities_count  INTEGER NOT NULL,
    facts_count     INTEGER NOT NULL,
    preferences_count INTEGER NOT NULL,
    sentiments_count  INTEGER NOT NULL,
    raw_json      JSONB     NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sentiment_log (
    id          VARCHAR          PRIMARY KEY,
    user_id     VARCHAR          NOT NULL,
    entity_id   VARCHAR          NOT NULL,
    entity_name VARCHAR          NOT NULL,
    sentiment   VARCHAR          NOT NULL,
    emotion     VARCHAR          NOT NULL,
    reason      TEXT             NOT NULL,
    confidence  DOUBLE PRECISION NOT NULL,
    observed_at DATE             NOT NULL,
    archived    BOOLEAN          NOT NULL,
    recorded_at TIMESTAMP        NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fact_log (
    id          VARCHAR          PRIMARY KEY,
    user_id     VARCHAR          NOT NULL,
    entity_id   VARCHAR          NOT NULL,
    entity_name VARCHAR          NOT NULL,
    relation    VARCHAR          NOT NULL,
    confidence  DOUBLE PRECISION NOT NULL,
    observed_at DATE             NOT NULL,
    recorded_at TIMESTAMP        NOT NULL
  );

  CREATE TABLE IF NOT EXISTS preference_log (
    id          VARCHAR          PRIMARY KEY,
    user_id     VARCHAR          NOT NULL,
    entity_id   VARCHAR          NOT NULL,
    entity_name VARCHAR          NOT NULL,
    polarity    VARCHAR          NOT NULL,
    reason      TEXT             NOT NULL,
    confidence  DOUBLE PRECISION NOT NULL,
    observed_at DATE             NOT NULL,
    recorded_at TIMESTAMP        NOT NULL
  );
`;
