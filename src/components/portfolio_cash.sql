CREATE TABLE IF NOT EXISTS public.portfolio_cash
(
    cash_id integer NOT NULL DEFAULT nextval('portfolio_cash_cash_id_seq'::regclass),
    portfolio_id integer NOT NULL,
    user_id integer NOT NULL,
    balance numeric(18,4) NOT NULL DEFAULT 0.00,
    currency character varying(10) COLLATE pg_catalog."default" NOT NULL DEFAULT 'MXN'::character varying,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT portfolio_cash_pkey PRIMARY KEY (cash_id),
    CONSTRAINT portfolio_cash_portfolio_id_key UNIQUE (portfolio_id),
    CONSTRAINT fk_portfolio_cash FOREIGN KEY (portfolio_id)
        REFERENCES public.portafolios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT fk_user_cash FOREIGN KEY (user_id)
        REFERENCES public.usuarios (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE public.portfolio_cash
    OWNER to garden_admin;
