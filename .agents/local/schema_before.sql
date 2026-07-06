--
-- PostgreSQL database dump
--

\restrict 0YporxmpZKAIwBeW4k3jYPIAZqBJY15tV83fx1vWVJUKvOZaR9xcKHThPOhNg6S

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: BusinessStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BusinessStatus" AS ENUM (
    'ACTIVO',
    'MOROSO',
    'DESACTIVADO'
);


--
-- Name: IvaCondition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IvaCondition" AS ENUM (
    'RESPONSABLE_INSCRIPTO',
    'MONOTRIBUTO'
);


--
-- Name: MovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MovementType" AS ENUM (
    'SALE',
    'RETURN',
    'ADJUSTMENT',
    'PURCHASE'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'pendiente',
    'confirmado',
    'entregado',
    'consignacion'
);


--
-- Name: OrderUpdateType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderUpdateType" AS ENUM (
    'ORDER_CREATED',
    'ITEMS_ADDED',
    'ITEMS_REMOVED',
    'ITEMS_UPDATED',
    'STATUS_CHANGED',
    'PAYMENT_UPDATED',
    'DISCOUNT_CHANGED',
    'CLIENT_CHANGED'
);


--
-- Name: PaidStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaidStatus" AS ENUM (
    'pago',
    'inpago'
);


--
-- Name: Plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Plan" AS ENUM (
    'BASIC',
    'PRO',
    'ENTERPRISE'
);


--
-- Name: SessionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SessionStatus" AS ENUM (
    'OPEN',
    'CLOSED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'USER',
    'SUPER_ADMIN'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Account" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


--
-- Name: Brand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Brand" (
    id text NOT NULL,
    name text NOT NULL,
    "businessId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Business; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Business" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    logo text,
    "userId" text,
    "accountStatus" public."BusinessStatus" DEFAULT 'ACTIVO'::public."BusinessStatus" NOT NULL,
    address text,
    cert text,
    "condicionIva" public."IvaCondition" DEFAULT 'MONOTRIBUTO'::public."IvaCondition" NOT NULL,
    cuit text,
    "inicioActividades" timestamp(3) without time zone,
    key text,
    "lastPaymentDate" timestamp(3) without time zone,
    "razonSocial" text,
    "ptoVenta" integer[] DEFAULT ARRAY[]::integer[],
    "brandLogo" text,
    "brandPrimaryColor" text DEFAULT '#2563eb'::text,
    "brandSecondaryColor" text DEFAULT '#f59e0b'::text,
    "defaultInvoiceDueDays" integer DEFAULT 30,
    "enableCustomerNotifications" boolean DEFAULT false,
    "enableLowStockAlerts" boolean DEFAULT false,
    "lowStockThreshold" integer DEFAULT 10,
    timezone text DEFAULT 'America/Argentina/Buenos_Aires'::text
);


--
-- Name: BusinessFeatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."BusinessFeatures" (
    id text NOT NULL,
    "businessId" text NOT NULL,
    plan public."Plan" DEFAULT 'BASIC'::public."Plan" NOT NULL,
    "hasAfipBilling" boolean DEFAULT false NOT NULL,
    "hasPublicCatalog" boolean DEFAULT false NOT NULL,
    "hasClientLedger" boolean DEFAULT false NOT NULL,
    "hasMultiCashbox" boolean DEFAULT false NOT NULL,
    "maxUsers" integer DEFAULT 1 NOT NULL,
    "maxProducts" integer DEFAULT 100 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "hasSupplierFilter" boolean DEFAULT false NOT NULL
);


--
-- Name: CashBox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CashBox" (
    id text NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    "businessId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    name text DEFAULT 'Caja Principal'::text NOT NULL
);


--
-- Name: CashMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CashMovement" (
    id text NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    seller text,
    "paidMethod" text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "businessId" text NOT NULL,
    "orderId" text,
    "cashboxSessionId" text
);


--
-- Name: CashboxSession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CashboxSession" (
    id text NOT NULL,
    "cashboxId" text NOT NULL,
    "userId" text NOT NULL,
    "businessId" text NOT NULL,
    "startTime" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endTime" timestamp(3) without time zone,
    "initialBalance" double precision DEFAULT 0 NOT NULL,
    "finalBalance" double precision,
    status public."SessionStatus" DEFAULT 'OPEN'::public."SessionStatus" NOT NULL,
    "zReport" jsonb
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    "businessId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Client; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    "cellPhone" text,
    balance double precision DEFAULT 0 NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_update timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "businessId" text NOT NULL,
    email text
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    status public."OrderStatus" DEFAULT 'confirmado'::public."OrderStatus" NOT NULL,
    "paidStatus" public."PaidStatus" DEFAULT 'inpago'::public."PaidStatus" NOT NULL,
    seller text,
    "clientId" text,
    "businessId" text NOT NULL,
    "discountAmount" double precision DEFAULT 0 NOT NULL,
    "discountPercentage" double precision DEFAULT 0 NOT NULL,
    "paymentMethod" text DEFAULT 'Efectivo'::text,
    "paymentMethod2" text,
    "totalMethod2" double precision DEFAULT 0,
    "CAE" jsonb,
    "clientDocumentNumber" text,
    "clientIvaCondition" text,
    "cashboxSessionId" text
);


--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text,
    code text,
    description text,
    price double precision DEFAULT 0 NOT NULL,
    quantity double precision DEFAULT 0 NOT NULL,
    "subTotal" double precision DEFAULT 0 NOT NULL,
    "costPrice" double precision DEFAULT 0 NOT NULL,
    "addedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OrderUpdate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderUpdate" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "businessId" text NOT NULL,
    "updatedById" text NOT NULL,
    type public."OrderUpdateType" NOT NULL,
    message text,
    changes jsonb,
    snapshot jsonb,
    version integer NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    code text,
    description text,
    price double precision DEFAULT 0 NOT NULL,
    "salePrice" double precision DEFAULT 0 NOT NULL,
    gain double precision DEFAULT 0 NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    unit text,
    image text,
    "imageName" text,
    client_bonus double precision DEFAULT 0 NOT NULL,
    "supplierId" text,
    "businessId" text NOT NULL,
    last_update timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    creation_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "brandId" text,
    "categoryId" text,
    "subCategoryId" text,
    catalog boolean DEFAULT true NOT NULL,
    details text,
    codebar text
);


--
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    url text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProductRanking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductRanking" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "businessId" text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    "totalSold" double precision DEFAULT 0 NOT NULL,
    "totalIncome" double precision DEFAULT 0 NOT NULL
);


--
-- Name: SaleReturn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SaleReturn" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    total double precision DEFAULT 0 NOT NULL,
    reason text,
    "orderId" text NOT NULL,
    "businessId" text NOT NULL
);


--
-- Name: SaleReturnItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SaleReturnItem" (
    id text NOT NULL,
    "returnId" text NOT NULL,
    "orderItemId" text NOT NULL,
    "productId" text,
    quantity double precision NOT NULL,
    "refundAmount" double precision DEFAULT 0 NOT NULL
);


--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    type public."MovementType" NOT NULL,
    quantity double precision NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "productId" text NOT NULL,
    "orderId" text,
    "businessId" text NOT NULL,
    reason text
);


--
-- Name: Subcategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subcategory" (
    id text NOT NULL,
    name text NOT NULL,
    "categoryId" text NOT NULL,
    "businessId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    creation_date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "businessId" text NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    gain double precision DEFAULT 0 NOT NULL,
    iva double precision DEFAULT 0 NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text,
    email text,
    password text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    "emailVerified" timestamp(3) without time zone,
    image text,
    "businessId" text NOT NULL,
    "cashboxId" text
);


--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VerificationToken" (
    id text NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Account Account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_pkey" PRIMARY KEY (id);


--
-- Name: Brand Brand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_pkey" PRIMARY KEY (id);


--
-- Name: BusinessFeatures BusinessFeatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BusinessFeatures"
    ADD CONSTRAINT "BusinessFeatures_pkey" PRIMARY KEY (id);


--
-- Name: Business Business_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Business"
    ADD CONSTRAINT "Business_pkey" PRIMARY KEY (id);


--
-- Name: CashBox CashBox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashBox"
    ADD CONSTRAINT "CashBox_pkey" PRIMARY KEY (id);


--
-- Name: CashMovement CashMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashMovement"
    ADD CONSTRAINT "CashMovement_pkey" PRIMARY KEY (id);


--
-- Name: CashboxSession CashboxSession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashboxSession"
    ADD CONSTRAINT "CashboxSession_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: OrderUpdate OrderUpdate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUpdate"
    ADD CONSTRAINT "OrderUpdate_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- Name: ProductRanking ProductRanking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductRanking"
    ADD CONSTRAINT "ProductRanking_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: SaleReturnItem SaleReturnItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_pkey" PRIMARY KEY (id);


--
-- Name: SaleReturn SaleReturn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: Subcategory Subcategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subcategory"
    ADD CONSTRAINT "Subcategory_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VerificationToken VerificationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VerificationToken"
    ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Account_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON public."Account" USING btree (provider, "providerAccountId");


--
-- Name: Brand_name_businessId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Brand_name_businessId_key" ON public."Brand" USING btree (name, "businessId");


--
-- Name: BusinessFeatures_businessId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "BusinessFeatures_businessId_idx" ON public."BusinessFeatures" USING btree ("businessId");


--
-- Name: BusinessFeatures_businessId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "BusinessFeatures_businessId_key" ON public."BusinessFeatures" USING btree ("businessId");


--
-- Name: Business_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Business_slug_key" ON public."Business" USING btree (slug);


--
-- Name: Business_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Business_userId_key" ON public."Business" USING btree ("userId");


--
-- Name: CashboxSession_businessId_startTime_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CashboxSession_businessId_startTime_idx" ON public."CashboxSession" USING btree ("businessId", "startTime");


--
-- Name: Category_name_businessId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_name_businessId_key" ON public."Category" USING btree (name, "businessId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: OrderUpdate_businessId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderUpdate_businessId_date_idx" ON public."OrderUpdate" USING btree ("businessId", date);


--
-- Name: OrderUpdate_orderId_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderUpdate_orderId_version_key" ON public."OrderUpdate" USING btree ("orderId", version);


--
-- Name: Order_businessId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_businessId_date_idx" ON public."Order" USING btree ("businessId", date);


--
-- Name: ProductImage_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductImage_productId_idx" ON public."ProductImage" USING btree ("productId");


--
-- Name: ProductRanking_productId_month_year_businessId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductRanking_productId_month_year_businessId_key" ON public."ProductRanking" USING btree ("productId", month, year, "businessId");


--
-- Name: Product_businessId_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_businessId_categoryId_idx" ON public."Product" USING btree ("businessId", "categoryId");


--
-- Name: Product_businessId_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_businessId_code_idx" ON public."Product" USING btree ("businessId", code);


--
-- Name: Product_businessId_codebar_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_businessId_codebar_idx" ON public."Product" USING btree ("businessId", codebar);


--
-- Name: Product_businessId_description_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_businessId_description_idx" ON public."Product" USING btree ("businessId", description);


--
-- Name: Product_businessId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_businessId_idx" ON public."Product" USING btree ("businessId");


--
-- Name: SaleReturn_businessId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SaleReturn_businessId_date_idx" ON public."SaleReturn" USING btree ("businessId", date);


--
-- Name: StockMovement_businessId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_businessId_date_idx" ON public."StockMovement" USING btree ("businessId", date);


--
-- Name: StockMovement_productId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_productId_date_idx" ON public."StockMovement" USING btree ("productId", date);


--
-- Name: Subcategory_name_categoryId_businessId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subcategory_name_categoryId_businessId_key" ON public."Subcategory" USING btree (name, "categoryId", "businessId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: VerificationToken_email_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_email_token_key" ON public."VerificationToken" USING btree (email, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: Account Account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Account"
    ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Brand Brand_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Brand"
    ADD CONSTRAINT "Brand_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BusinessFeatures BusinessFeatures_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."BusinessFeatures"
    ADD CONSTRAINT "BusinessFeatures_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CashBox CashBox_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashBox"
    ADD CONSTRAINT "CashBox_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CashMovement CashMovement_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashMovement"
    ADD CONSTRAINT "CashMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CashMovement CashMovement_cashboxSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashMovement"
    ADD CONSTRAINT "CashMovement_cashboxSessionId_fkey" FOREIGN KEY ("cashboxSessionId") REFERENCES public."CashboxSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CashMovement CashMovement_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashMovement"
    ADD CONSTRAINT "CashMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CashboxSession CashboxSession_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashboxSession"
    ADD CONSTRAINT "CashboxSession_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CashboxSession CashboxSession_cashboxId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashboxSession"
    ADD CONSTRAINT "CashboxSession_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES public."CashBox"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CashboxSession CashboxSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CashboxSession"
    ADD CONSTRAINT "CashboxSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Category Category_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Client Client_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderItem OrderItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderUpdate OrderUpdate_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUpdate"
    ADD CONSTRAINT "OrderUpdate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: OrderUpdate OrderUpdate_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUpdate"
    ADD CONSTRAINT "OrderUpdate_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderUpdate OrderUpdate_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderUpdate"
    ADD CONSTRAINT "OrderUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_cashboxSessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_cashboxSessionId_fkey" FOREIGN KEY ("cashboxSessionId") REFERENCES public."CashboxSession"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductRanking ProductRanking_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductRanking"
    ADD CONSTRAINT "ProductRanking_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductRanking ProductRanking_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductRanking"
    ADD CONSTRAINT "ProductRanking_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_brandId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES public."Brand"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_subCategoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES public."Subcategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleReturnItem SaleReturnItem_orderItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES public."OrderItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleReturnItem SaleReturnItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SaleReturnItem SaleReturnItem_returnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturnItem"
    ADD CONSTRAINT "SaleReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES public."SaleReturn"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleReturn SaleReturn_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleReturn SaleReturn_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SaleReturn"
    ADD CONSTRAINT "SaleReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockMovement StockMovement_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Subcategory Subcategory_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subcategory"
    ADD CONSTRAINT "Subcategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subcategory Subcategory_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subcategory"
    ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Supplier Supplier_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_businessId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_cashboxId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES public."CashBox"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 0YporxmpZKAIwBeW4k3jYPIAZqBJY15tV83fx1vWVJUKvOZaR9xcKHThPOhNg6S

