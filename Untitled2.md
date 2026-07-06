
Changes: 
    - Cuando el cliente tiene un Pago Vencido:
        - Ajustar las actions para que se valide SIEMPRE que el cliente NO tenga el pago vencido 
        - Modal inmovible del front como mensaje:
            - El modal sera como el reutilizable de FeatureBlockedModal, pero con una particularidad. Cuando el cliente tenga el plan vencido vera este modal y no podrá sacarlo:
                - El modal no tendra la cruz como el resto
                - El boton de contactar por whatsapp no lo cerrara
                - Recargar la pagina lo volvera a mostrar
                - Al quitarlo con las herramientas del dev, asegurar que el return del useEffect lo vuelva a mostrar o redireccione la pagina 

Bugs:
    - Cuentas Corrientes (Fichero):
        - Bug: se visualizan ventas (lo correcto es solo visualizar cuentas corrientes)    
        - Tabla de productos: modificar los iconos para que tenga el mismo themming que en cuentas y usuarios
    - Crear Vendedor:
        - No limpia los campos, al crear un nuevo vendedor tengo los datos anteriores (validar que se limpien todos los campos)  
  - Analizar reportes. Cuando se actualizan ventas, entradas y salidas de stock. Esta ok? Validar casos del mismo producto, agregar test cases si es necesario  
- Mejoras (Mantener estilo de UI igual para todos, basado en lo que hay)
  - Caja -> Agregar paginado
  - Cajas -> Agregar paginado
  - Usuarios -> Agregar paginado
  -  
- Test
  - Validar que los planes tengan sentido. Es decir, si un usuario con plan BASIC intenta facturar deberia ver el modal en el front y en las actions negarse. Lo mismo para el resto de los casos. Agregar los tests necesarios para cubrir todos los casos y planes
- 
- Code Refactor:
  - Replace role comparisson with "ADMIN", follow a clean code pattern and put it into Enum or similar. Check patterns like business.condicionIva as "MONOTRIBUTO" | "RESPONSABLE_INSCRIPTO",
    cert: business.cert ? "CONFIGURADO" : "",
    key: business.key ? "CONFIGURADO" : ""
  - Detectar casos potenciales que deben ser mejorados, magic numbers, magic strings, useEffects mal usados, duplicacion de llamdas, algoritmos muy complejos, n+1 queries, etc. Diseñar un plan de implementacion para mejorarlo. Objetivo en mente: Legibilidad, Escalabilidad, Atomicidad y facil de migrar (ejemplo server actions a API con node o fast api)
  - Analisis completo de mejoras de codigo siguiendo buenos patrones y clean code



  
prd-test-plan-enforcement
(TERMINAR)

prd-code-refactor
(NEXT)

Plan para:
  - Ajustar BusinessFeatures (tal vez se deba eliminar), ya que los overrides se contradicen con los planes de plandefinition
  - Exportar facturas / ventas para contador
  - Bug:
  Flujo:
      1. Editar venta
      2. Agregar item/quitar item (ej agregar 1 unidad)
      3. Ver reportes egresos/ingresos 
      4. Analizar comportamientos (se ve 1 egreso y 2 ingresos, esperado: 1 egreso y 0 ingresos) 
   
Terminado el plan:
  

 Planea una documentacion completa de las actions donde tenga los parametros de entrada y salida, una breve descripcion de lo que hace, accesos, policies, casos de prueba necesarios y otra info que consideres. Crea docs/API/ y dentro pon la descripcion de TODAS las actions enumeradas por fases pensando en una migracion a una API. Esta documentacion sera clave para entender el funcionamiento esperado de la API y el diseño de la arquitectura de la misma. Ademas, en casos donde sea necesario añade posibles mejoras u optimizaciones

  - Documentar todo el proyecto con diagramas y demas. Analizar NotebookLM, Obsidean o similares para tener todo documentado
  


  -  Productos equivalentes: En repuestos, el cliente busca la pieza "A", no la tienes, pero la pieza "B" sirve igual 
  - Atajos de teclado: alguna mejora? 


Superadmin
  - Quitar crear usuario de login (dejar action para superadmin)
  - Validar pago vencido

Ideas de Tier Plans:
  - Plan Básico (~$15 - $20 USD / mes): Control de stock, ventas internas (sin AFIP), 1 o 2 usuarios, ideal para el kiosco o comercio muy pequeño que solo quiere saber qué tiene.
  - Plan Profesional (~$30 - $45 USD / mes): Facturación electrónica AFIP integrada, usuarios ilimitados (o hasta 5), múltiples cajas, manejo de cuentas corrientes de clientes. (Este es el que comprará la ferretería promedio).
  - Plan Empresa (~$60+ USD / mes): Múltiples sucursales, reportes avanzados, integraciones con MercadoLibre, etc.
 