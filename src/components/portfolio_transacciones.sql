CREATE TABLE IF NOT EXISTS public.portfolio_transactions
(
    transaction_id integer NOT NULL DEFAULT nextval('portfolio_transactions_transaction_id_seq'::regclass),
    portfolio_id integer NOT NULL,
    user_id integer NOT NULL,
    ticker character varying(20) COLLATE pg_catalog."default" NOT NULL,
    transaction_type character varying(12) COLLATE pg_catalog."default" NOT NULL,
    quantity double precision NOT NULL,
    price double precision,
    transaction_date timestamp with time zone NOT NULL,
    total_amount double precision NOT NULL,
    currency character varying(10) COLLATE pg_catalog."default" NOT NULL DEFAULT 'MXN'::character varying,
    notes text COLLATE pg_catalog."default",
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT portfolio_transactions_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT fk_portfolio FOREIGN KEY (portfolio_id)
        REFERENCES public.portafolios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT portfolio_transactions_transaction_type_check CHECK (transaction_type::text = ANY (ARRAY['BUY'::character varying, 'SELL'::character varying, 'DIVIDEND'::character varying, 'DEPOSIT'::character varying, 'WITHDRAWAL'::character varying]::text[]))
)

TABLESPACE pg_default;

ALTER TABLE public.portfolio_transactions
    OWNER to garden_admin;

-- Index: public.idx_transactions_portfolio_ticker
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_ticker
    ON public.portfolio_transactions USING btree
    (portfolio_id ASC NULLS LAST, ticker COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: public.idx_transactions_user_date
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON public.portfolio_transactions USING btree
    (user_id ASC NULLS LAST, transaction_date ASC NULLS LAST)
    TABLESPACE pg_default;