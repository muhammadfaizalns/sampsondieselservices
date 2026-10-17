"""Build crawlable service and information pages from confirmed business details."""
from pathlib import Path
import re,json,html,os
ROOT=Path(__file__).resolve().parents[1]/'dist'
ORIGIN=os.environ.get('SITE_ORIGIN','https://sampson-heavy-diesel.ft-64db.chatgpt.site').rstrip('/')
NAME='Sampson Heavy Diesel Services'
PHONE='0474 372 852'
HOME=ROOT/'index.html'
source=HOME.read_text()
header=re.search(r'  <div class="topline">.*?</header>',source,re.S).group(0).replace('href="#"','href="/"').replace('href="#services"','href="/services/"').replace('href="#coverage"','href="/service-areas/"').replace('href="#clive"','href="/#clive"')
footer='''<footer><div class="wrap"><div class="footer-inner"><a class="brand" href="/" aria-label="Sampson Heavy Diesel Services home"><img class="brand-logo" src="/assets/sampson-equipment-logo.webp" width="1991" height="703" loading="lazy" alt="Sampson Heavy Diesel Services logo with bulldozer, truck, tractor and digger"></a><p>© 2026 Sampson Heavy Diesel Services</p><a href="tel:+61474372852">0474 372 852</a></div><nav class="footer-links" aria-label="Footer"><a href="/services/">Services</a><a href="/service-areas/">Victoria service areas</a><a href="/service-information/">Service information</a><a href="/privacy/">Privacy and access</a><a href="/credits/">Images and credits</a></nav><p class="footer-note">Victoria wide enquiries. Travel, timing and job suitability confirmed directly with Clive.</p></div></footer><div class="mobile-contact"><a href="tel:+61474372852">Call Clive · 0474 372 852</a><a href="sms:+61474372852" aria-label="Send Clive a text message">Text</a></div>'''
org={'@type':'Organization','@id':ORIGIN+'/#business','name':NAME,'url':ORIGIN+'/','logo':ORIGIN+'/assets/sampson-equipment-logo.png','telephone':'+61474372852','areaServed':{'@type':'AdministrativeArea','name':'Victoria, Australia'},'contactPoint':{'@type':'ContactPoint','name':'Clive Sampson','telephone':'+61474372852','contactType':'service enquiries','availableLanguage':'English'}}
services = [{'slug': 'truck-servicing',
  'name': 'Truck servicing',
  'title': 'Truck Servicing Victoria | Sampson Heavy Diesel',
  'heading': 'Truck servicing in Victoria',
  'intro': 'Keep maintenance planned around the truck and its next run. Discuss routine heavy diesel '
           'servicing with Clive Sampson for a single truck or a transport fleet.',
  'description': 'Truck servicing and heavy diesel maintenance across Victoria. Discuss your truck, service '
                 'history and next run with Clive Sampson. Call 0474 372 852.',
  'sections': [('Make the next service easier to plan',
                '<p>Start with the truck’s make, model, kilometres and engine hours where available. Tell '
                'Clive when it was last serviced and whether any work is already due. Manufacturer '
                'schedules, operating conditions and service history help frame the '
                'conversation.</p><p>Share the work you want carried out and the date you need the truck '
                'back. Clive can discuss job suitability, where the work can happen and availability before '
                'you commit.</p>'),
               ('What to mention when you call',
                '<ul><li>Make, model, registration and engine details if known.</li><li>Current kilometres '
                'or engine hours and the last service record.</li><li>Warning lights, leaks, unusual noise '
                'or changes you have noticed.</li><li>Your location, truck access and preferred service '
                'date.</li></ul><p>You do not need to diagnose the fault first. Describe what has changed '
                'and when it happens.</p>'),
               ('One truck or several',
                '<p>An owner operator may need servicing around the next load. A fleet may need to stagger '
                'work so trucks are not all unavailable together. Discuss the number of vehicles, their '
                'priorities and any downtime limits with Clive.</p><p>For ongoing planning, see <a '
                'href="/services/fleet-maintenance/">fleet maintenance</a>. If the issue is happening on the '
                'road, start with <a href="/services/mobile-truck-mechanic/">field service '
                'enquiries</a>.</p>'),
               ('Servicing across Victoria',
                '<p>Sampson Heavy Diesel Services takes enquiries across Melbourne and regional Victoria. '
                'Travel and timing depend on your location and the work required. <a '
                'href="/service-areas/">Find your suburb or postcode</a>, then call Clive to discuss '
                'availability.</p>')]},
 {'slug': 'heavy-equipment-servicing',
  'name': 'Heavy equipment servicing',
  'title': 'Heavy Equipment Servicing Victoria | Sampson Heavy Diesel',
  'heading': 'Heavy equipment servicing in Victoria',
  'intro': 'Servicing and maintenance for working machinery across Victoria. Discuss your equipment, '
           'operating hours and work requirements directly with Clive Sampson.',
  'description': 'Heavy equipment servicing and maintenance enquiries across Victoria. Discuss your machine, '
                 'service history and location with Clive Sampson on 0474 372 852.',
  'sections': [('Plan maintenance around your equipment',
                '<p>Working machinery needs maintenance planning that reflects its use, operating hours and '
                'service history. Share the machine make, model, serial number and available records with '
                'Clive, together with the work required.</p><p>Discuss the manufacturer service schedule, '
                'known issues and preferred maintenance dates. The machine type and proposed work help '
                'establish a suitable service arrangement.</p>'),
               ('Information to have ready',
                '<ul><li>Machine make, model, serial number and engine details if known.</li><li>Current '
                'operating hours and the last service record.</li><li>Warning messages, leaks, unusual '
                'noises or changes in operation.</li><li>Site location, equipment access and any site entry '
                'requirements.</li><li>Preferred dates and any limits on equipment '
                'downtime.</li></ul><p>Describe the symptoms you have noticed. You do not need to identify '
                'the cause before making an enquiry.</p>'),
               ('Field service and component work',
                '<p>For machinery at a worksite, call to discuss whether field service is suitable for the '
                'work required. Safe access, the fault and equipment requirements affect the arrangements. '
                'Attendance, travel and timing are confirmed directly with Clive.</p><p>For an assembly '
                'requiring separate assessment, see <a href="/services/component-rebuilding/">component '
                'rebuilding</a>. For maintenance across several machines, discuss <a '
                'href="/services/fleet-maintenance/">fleet and equipment maintenance</a>.</p>'),
               ('Melbourne and regional Victoria',
                '<p>Sampson Heavy Diesel Services takes heavy equipment enquiries across Victoria. Provide '
                'the site address, suburb or nearest town, along with the machine details. <a '
                'href="/service-areas/">Find your Victorian locality or postcode</a>, then call to discuss '
                'the job.</p><p>Confirm the scope, location, timing and applicable charges before work is '
                'arranged.</p>')]},
 {'slug': 'agricultural-machinery-servicing',
  'name': 'Agricultural machinery servicing',
  'title': 'Agricultural Machinery Servicing Victoria | Sampson',
  'heading': 'Agricultural machinery servicing in Victoria',
  'intro': 'Servicing and heavy diesel support for agricultural machinery across Victoria. Discuss your '
           'machine, service history and operating schedule directly with Clive Sampson.',
  'description': 'Agricultural and farm machinery servicing enquiries across Victoria. Discuss machine '
                 'details, operating hours and location with Clive Sampson on 0474 372 852.',
  'sections': [('Maintenance for your operating schedule',
                '<p>Farm machinery maintenance needs to account for operating hours, service records and the '
                'work ahead. Tell Clive which machine needs attention, how it is used and when it can be '
                'made available for servicing.</p><p>Share the manufacturer service information, any '
                'maintenance already due and known faults. If timing is important for seasonal work, raise '
                'that when discussing availability.</p>'),
               ('Useful details for your enquiry',
                '<ul><li>Machine make, model, serial number and engine details if available.</li><li>Current '
                'operating hours and service history.</li><li>Warning messages, starting concerns, leaks, '
                'noises or changes in operation.</li><li>Farm location, nearest town and access '
                'arrangements.</li><li>Your preferred timing and who can approve the '
                'work.</li></ul><p>Registration details may help for a registered vehicle. For other '
                'machinery, the identification plate and machine records can help explain the equipment '
                'involved.</p>'),
               ('Discuss the work and location',
                '<p>Call to discuss planned servicing, a developing fault or a machine that has stopped '
                'working. Clive will confirm job suitability, availability and whether field service is '
                'appropriate.</p><p>Tell Clive about site access, the ground conditions where the machine is '
                'located and any restrictions relevant to attendance. Work location, travel and timing are '
                'agreed for the actual job.</p>'),
               ('Component repairs and ongoing maintenance',
                '<p>For a worn or failed assembly, discuss <a '
                'href="/services/component-rebuilding/">component repair and rebuilding options</a>. Provide '
                'the component details and whether it is still fitted or has been removed.</p><p>If several '
                'machines need attention, see <a href="/services/fleet-maintenance/">fleet and equipment '
                'maintenance</a>. For a location enquiry, use the <a href="/service-areas/">Victorian suburb '
                'and postcode lookup</a> or call with your nearest town.</p>')]},
 {'slug': 'truck-transmission-repairs',
  'name': 'Truck transmission repairs',
  'title': 'Truck Transmission Repairs Victoria | Sampson',
  'heading': 'Truck transmission repairs in Victoria',
  'intro': 'Hard to shift, slipping out of gear or hearing something new? Talk to Clive about truck '
           'transmission repairs and the next step for your vehicle.',
  'description': 'Truck transmission repair enquiries across Victoria. Hard shifting, gear noise or loss of '
                 'drive? Discuss symptoms with Clive Sampson on 0474 372 852.',
  'sections': [('Describe the transmission concern',
                '<p>The useful detail is what happens, not a guessed diagnosis. Tell Clive which gear or '
                'driving condition brings the problem on, whether it changes when the truck warms up, and '
                'when you first noticed it.</p><p>A noise, warning or change in shifting does not establish '
                'the cause on its own. The truck and transmission details help Clive discuss the assessment '
                'and whether the job is suitable.</p>'),
               ('Bring the right details to the call',
                '<ul><li>Truck make, model, registration and transmission type if known.</li><li>The exact '
                'symptom, such as hard selection, unusual noise or loss of drive.</li><li>Whether the issue '
                'happens under load, while changing gear or at a standstill.</li><li>Recent repairs, service '
                'history and any visible warning message.</li><li>Your location and whether the truck can be '
                'accessed safely.</li></ul>'),
               ('Assessment before repair decisions',
                '<p>Discuss inspection, removal, repair or rebuilding requirements directly with Clive. The '
                'right approach depends on the component, fault and condition. Parts, labour, timing and any '
                'further work should be discussed before a booking or repair is approved.</p><p>For work on '
                'a removed assembly, read about <a href="/services/component-rebuilding/">component '
                'rebuilding</a>. For a truck stopped on the road, use the <a '
                'href="/services/mobile-truck-mechanic/">field service enquiry page</a>.</p>'),
               ('Victoria wide enquiries',
                '<p>Have your suburb, postcode or nearest town ready. Clive will confirm travel, timing and '
                'availability for your truck.</p>')]},
 {'slug': 'component-rebuilding',
  'name': 'Component rebuilding',
  'title': 'Diesel Component Rebuilding Victoria | Sampson',
  'heading': 'Component rebuilding in Victoria',
  'intro': 'Assessment, repair and rebuilding enquiries for components from trucks, heavy equipment and '
           'agricultural machinery. Discuss the assembly, its condition and the work required with Clive '
           'Sampson.',
  'description': 'Heavy diesel component repair and rebuilding enquiries for trucks and machinery across '
                 'Victoria. Contact Clive Sampson on 0474 372 852.',
  'sections': [('Start with the component and its condition',
                '<p>Identify the component, the vehicle or equipment it came from, and the problem you are '
                'trying to solve. A part number or identification plate can help establish the assembly. '
                'Photos may help explain visible damage when you contact Clive.</p><p>Tell him whether the '
                'component is still fitted, already removed or partly dismantled. Keep any available service '
                'records and details of previous repairs with the enquiry.</p>'),
               ('Repair, rebuild or another option',
                '<p>The condition of the part, the fault and parts availability affect the options. Discuss '
                'assessment and rebuilding suitability before arranging delivery or approving work. A '
                'rebuild is not automatically the right answer for every failed part.</p><p>Clive can '
                'discuss the work required and the next step. Any scope, pricing and timing are confirmed '
                'for the actual job rather than assumed from a website illustration.</p>'),
               ('Information for the assessment',
                '<ul><li>Component name, make, model and part number if available.</li><li>Vehicle or '
                'machine details and the failure symptoms.</li><li>Whether the component is fitted, removed '
                'or partly dismantled.</li><li>Available service records and details of associated '
                'parts.</li><li>Current location and when the equipment or component is needed.</li></ul>'),
               ('Complete assemblies in three dimensions',
                '<p>The <a href="/#transmissions">assembly gallery</a> shows ten complete assemblies '
                'and machines, including a full engine and transmission. The models are illustrative '
                'examples. Discuss service suitability for your equipment directly with Clive.</p><p>Call Clive to discuss your component and its condition. '
                'See the dedicated <a href="/services/truck-transmission-repairs/">truck transmission '
                'page</a> for truck shifting and drive concerns.</p>')]},
 {'slug': 'mobile-truck-mechanic',
  'name': 'Mobile diesel mechanic and field service',
  'title': 'Mobile Diesel Mechanic Victoria | Sampson Heavy Diesel',
  'heading': 'Field service for trucks and machinery',
  'intro': 'Mobile heavy diesel support for trucks, heavy equipment and agricultural machinery across '
           'Victoria. Call Clive with your location, equipment details and symptoms to discuss the next '
           'step.',
  'description': 'Mobile diesel mechanic and field service enquiries for trucks, heavy equipment and farm '
                 'machinery across Victoria. Call Clive Sampson on 0474 372 852.',
  'sections': [('Provide the location and access details',
                '<p>Give the site address, road, nearest town, suburb or postcode. A map pin can help '
                'explain a remote location. Tell Clive whether the vehicle or machine is beside a road, in a '
                'yard, on a farm or at a worksite, and describe any access restrictions.</p><p>For an '
                'immediate emergency or danger, call 000. This website does not provide emergency dispatch '
                'or confirm that a vehicle or machine is safe to operate.</p>'),
               ('Describe the equipment and symptoms',
                '<ul><li>Vehicle or machine make, model and identifying details.</li><li>What happened '
                'before it stopped or the warning appeared.</li><li>Warning messages, noises, leaks or loss '
                'of drive.</li><li>Any attached equipment, trailer or site access requirements.</li><li>Your '
                'current location and a contact number.</li></ul><p>Clive will discuss availability and '
                'whether field service is suitable. Attendance, timing and travel arrangements are confirmed '
                'directly.</p>'),
               ('Establish a suitable repair arrangement',
                '<p>The fault, safe access, equipment and parts requirements affect where work can be '
                'performed. Some jobs may require a workshop assessment, component removal or another '
                'arrangement. Calling first helps establish a practical next step.</p><p>For an urgent '
                'mechanical issue, call to check availability. Text messages may not be seen '
                'immediately.</p>'),
               ('Melbourne and regional Victoria',
                '<p>Use the <a href="/service-areas/">Victoria suburb and postcode lookup</a> to help '
                'identify a location. For a remote farm or worksite, provide the nearest town and access '
                'instructions as well.</p><p>For planned work, see <a '
                'href="/services/truck-servicing/">truck servicing</a>, <a '
                'href="/services/heavy-equipment-servicing/">heavy equipment servicing</a> or <a '
                'href="/services/agricultural-machinery-servicing/">agricultural machinery '
                'servicing</a>.</p>')]},
 {'slug': 'fleet-maintenance',
  'name': 'Fleet and equipment maintenance',
  'title': 'Fleet and Equipment Maintenance Victoria | Sampson',
  'heading': 'Fleet and equipment maintenance in Victoria',
  'intro': 'Plan maintenance for trucks, heavy equipment and agricultural machinery around service records '
           'and operational requirements. Discuss the work and priorities directly with Clive Sampson.',
  'description': 'Fleet and equipment maintenance enquiries across Victoria. Planned servicing for trucks '
                 'and machinery. Contact Clive Sampson on 0474 372 852.',
  'sections': [('Set maintenance priorities',
                '<p>Start with the vehicles and machines needing attention, the service work due and any '
                'known faults. Makes, models, kilometres, engine hours and available service records help '
                'frame the maintenance discussion.</p><p>Share preferred dates and operational limits. Clive '
                'will confirm the proposed scope, availability and scheduling arrangements for your fleet or '
                'equipment.</p>'),
               ('Information for maintenance planning',
                '<ul><li>A vehicle and equipment list with identifying details.</li><li>Available service '
                'records, kilometres and engine hours.</li><li>Known faults or recurring concerns for each '
                'vehicle or machine.</li><li>Location, site access and when equipment can be made '
                'available.</li><li>Who can approve work and receive job updates.</li></ul>'),
               ('Planned servicing and developing faults',
                '<p>Scheduled maintenance and an unexpected fault may need different arrangements. Identify '
                'equipment that has stopped working or needs assessment before its next scheduled '
                'use.</p><p>See <a href="/services/truck-servicing/">truck servicing</a>, <a '
                'href="/services/heavy-equipment-servicing/">heavy equipment servicing</a> and <a '
                'href="/services/agricultural-machinery-servicing/">agricultural machinery servicing</a> for '
                'the relevant maintenance enquiry.</p>'),
               ('Agree the arrangements directly',
                '<p>Speak with Clive about the scope, location, timing and applicable charges before a '
                'booking is confirmed. Travel and access arrangements depend on the actual Victorian '
                'location and work required.</p><p>For a vehicle or machine requiring attention on site, '
                'discuss <a href="/services/mobile-truck-mechanic/">mobile field service</a>.</p>')]}]

def ld(extra=None):
 graph=[org,{'@type':'Person','@id':ORIGIN+'/#clive-sampson','name':'Clive Sampson','telephone':'+61474372852','url':ORIGIN+'/#clive','image':ORIGIN+'/assets/clive-sampson-profile.webp','worksFor':{'@id':ORIGIN+'/#business'}},{'@type':'WebSite','@id':ORIGIN+'/#website','url':ORIGIN+'/','name':NAME,'inLanguage':'en-AU','publisher':{'@id':ORIGIN+'/#business'}}]
 graph.extend(extra or [])
 return '<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False)+'</script>'

def schema_service(s):
 return {'@type':'Service','@id':ORIGIN+'/services/'+s['slug']+'/#service','name':s['name'],'serviceType':s['name'],'description':s['description'],'url':ORIGIN+'/services/'+s['slug']+'/','provider':{'@id':ORIGIN+'/#business'},'areaServed':{'@type':'AdministrativeArea','name':'Victoria, Australia'}}

def breadcrumbs(path,label):
 return {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':ORIGIN+'/'},{'@type':'ListItem','position':2,'name':label,'item':ORIGIN+path}]}

favicon=re.search(r'  <link rel="icon"[^>]+>',source).group(0)
def head(title,desc,path,extra=None,noindex=False):
 return f'''<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#171a18"><title>{html.escape(title)}</title><meta name="description" content="{html.escape(desc,quote=True)}"><link rel="canonical" href="{ORIGIN+path}"><meta property="og:title" content="{html.escape(title,quote=True)}"><meta property="og:description" content="{html.escape(desc,quote=True)}"><meta property="og:type" content="website"><meta property="og:image" content="{ORIGIN}/assets/sampson-equipment-logo.png"><meta property="og:image:alt" content="Sampson Heavy Diesel Services logo with bulldozer, truck, tractor and digger"><meta property="og:locale" content="en_AU"><meta name="twitter:card" content="summary"><meta property="og:url" content="{ORIGIN+path}">{favicon}<link rel="stylesheet" href="/style.css?v=8">{('<meta name="robots" content="noindex">' if noindex else '')}{ld(extra)}</head><body><a class="skip-link" href="#main">Skip to content</a>{header}'''

paths=['/']
def page(path,title,desc,body,extra=None,scripts='',noindex=False):
 p=ROOT/path.strip('/')/'index.html';p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(head(title,desc,path,extra,noindex)+f'<main id="main">{body}</main>'+footer+scripts+'</body></html>')
 if not noindex:paths.append(path)

def hero(label,title,intro,call=True):
 return f'''<section class="page-hero"><div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>{label}</span></nav><p class="eyebrow">SAMPSON HEAVY DIESEL SERVICES · VICTORIA</p><h1>{title}</h1><p>{intro}</p>{('<a class="button button-yellow" href="tel:+61474372852">Call Clive · 0474 372 852</a>' if call else '')}</div></section>'''

side='''<aside class="side-card"><h2>Talk to Clive</h2><p>Have your vehicle or equipment details, location and symptoms ready. Availability and the next step are confirmed directly.</p><a class="button button-yellow" href="tel:+61474372852">0474 372 852</a><p><a class="text-link" href="/service-information/">Before agreeing to work</a></p></aside>'''
for s in services:
 path='/services/'+s['slug']+'/'
 body=hero(s['name'],s['heading'],s['intro'])+'<section class="section"><div class="wrap page-grid"><div class="prose">'+''.join('<h2>'+h+'</h2>'+p for h,p in s['sections'])+'<h2>Related services</h2><div class="related-links">'+''.join(f'<a href="/services/{r["slug"]}/">{r["name"]}</a>' for r in services if r!=s)+'</div></div>'+side+'</div></section>'
 page(path,s['title'],s['description'],body,[schema_service(s),breadcrumbs(path,s['name'])])

body=hero('Services','Heavy diesel services for trucks and machinery','Servicing, transmission repairs, component rebuilding and field service for trucks, heavy equipment and agricultural machinery across Victoria. Discuss your equipment and work requirements directly with Clive Sampson.')+'<section class="section"><div class="wrap"><div class="service-grid">'+''.join(f'<article class="service-card"><h2 style="font-size:2rem">{s["name"]}</h2><p>{s["intro"]}</p><a class="service-link" href="/services/{s["slug"]}/">View service details<span class="sr-only"> for {s["name"].lower()}</span></a></article>' for s in services)+'</div></div></section>'
page('/services/','Heavy Diesel Services Victoria | Sampson','Truck, heavy equipment and agricultural machinery servicing across Victoria. Transmissions, component rebuilding and field service. Call Clive Sampson.',body,[schema_service(s) for s in services]+[breadcrumbs('/services/','Services')])

coverage=hero('Victoria service areas','Heavy diesel services across Victoria','For a truck, worksite or farm, find your suburb or postcode, then call Clive to discuss your equipment, location and the work required.',False)+'''<section class="section"><div class="wrap"><div class="coverage-search"><form id="coverage-form" hidden><label for="location-search">Suburb, town or Victorian postcode</label><div class="search-row"><input id="location-search" name="location" type="search" autocomplete="address-level2" maxlength="80" placeholder="Try Dandenong or 3175" aria-describedby="location-hint" required><button class="button button-yellow" type="submit">Find location</button></div><p id="location-hint" class="search-hint">Location lookup only. Attendance and timing must be confirmed with Clive.</p></form><div id="coverage-results" class="coverage-results" role="status" aria-live="polite"></div><noscript><p>Call Clive on <a href="tel:+61474372852">0474 372 852</a> with your location. Interactive lookup needs JavaScript.</p></noscript></div><div class="prose"><h2>Service enquiries across Victoria</h2><p>Sampson Heavy Diesel Services takes servicing and repair enquiries for trucks, heavy equipment and agricultural machinery across Victoria. Your location, access, the work required and Clive’s availability determine the arrangements. Call Clive to confirm arrangements before a booking.</p><p>If your location is not shown in the lookup, call with your nearest town, road name or map pin. Some localities share a postcode, and a postcode alone may not identify where the vehicle or machine is.</p><a class="button button-yellow" href="tel:+61474372852">Discuss your location · 0474 372 852</a></div><div class="region-list"><article><h3>Melbourne and surrounding suburbs</h3><p>For a vehicle or machine in a depot, yard, workshop or worksite, provide the suburb, access details and work required. Call to discuss planned servicing or field service arrangements.</p></article><article><h3>Geelong and western Victoria</h3><p>For Geelong, Ballarat and towns further west, provide the location and details of the truck, heavy equipment or agricultural machinery. Discuss the required work and preferred timing before arranging travel.</p></article><article><h3>Central and northern Victoria</h3><p>For Bendigo, Shepparton, Wodonga and surrounding towns, provide the road, farm or site address. Tell Clive about equipment access, operating hours and the symptoms before arranging attendance.</p></article><article><h3>Gippsland and eastern Victoria</h3><p>For farms, towns and worksites across Gippsland, the nearest town and a map pin can help explain your location. Call with your vehicle or machinery details to discuss suitability, travel and availability.</p></article><article><h3>Mallee and north western Victoria</h3><p>For Mildura, Swan Hill and remote locations, provide the nearest town, road and vehicle or machinery details. Discuss the work, access and travel arrangements directly before a booking is confirmed.</p></article></div><div class="prose"><h2>Choose the work you need</h2><div class="related-links">'''+''.join(f'<a href="/services/{s["slug"]}/">{s["name"]}</a>' for s in services)+'''</div></div><p class="source-note">Locality and postcode data derived from <a href="https://discover.data.vic.gov.au/en_AU/dataset/vicmap-address-rest-api" target="_blank" rel="noopener">Vicmap Address</a>. © State of Victoria, Department of Transport and Planning. <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Adapted for this lookup. Snapshot 1 October 2026. Property address data, not postal delivery validation. Some locations may be absent.</p></div></section>'''
page('/service-areas/','Diesel Mechanic Victoria | Suburb and Postcode Lookup','Find your Victorian suburb or postcode for truck, heavy equipment and agricultural machinery service enquiries across Melbourne and regional Victoria.',coverage,[breadcrumbs('/service-areas/','Victoria service areas')],'<script src="/coverage.js?v=1" defer></script>')

info='''<h1>Service information</h1><p class="updated">Updated 18 October 2026</p><h2>Call before booking</h2><p>Tell Clive your vehicle or equipment details, location and the work required. Availability, travel, job suitability and timing are confirmed directly. An enquiry does not confirm a booking or a response time.</p><h2>Scope and charges</h2><p>Before agreeing to work, discuss the scope, expected timing, parts, labour, travel and any diagnostic or call out charges. Ask which charges apply and how additional work will be approved. The information on this website is general and does not diagnose a fault or confirm that a vehicle or machine is safe to operate.</p><h2>Your consumer rights</h2><p>Nothing on this website excludes rights or remedies that cannot be excluded under Australian Consumer Law. For a concern about work or an invoice, contact Clive on <a href="tel:+61474372852">0474 372 852</a> with the job details.</p><h2>Urgent situations</h2><p>For an immediate emergency or danger, call 000. Sampson’s website is not an emergency dispatch service. Call Clive to check availability for mechanical assistance. Text messages may not be seen immediately.</p><h2>Illustrative assemblies and machinery</h2><p>Vehicle and machinery imagery is illustrative. The 3D gallery shows complete assembly and machinery examples. They are not photographs of customer work or a promise that every shown part is serviced. Discuss your particular vehicle, machine or component with Clive. <a href="/credits/">Read image and model credits</a>.</p><h2>Contact</h2><p>Clive Sampson<br>Sampson Heavy Diesel Services<br>Victoria, Australia<br><a href="tel:+61474372852">0474 372 852</a></p>'''
privacy='''<h1>Privacy and website access</h1><p class="updated">Updated 18 October 2026</p><h2>Contacting Clive</h2><p>Calling or texting from this website opens your device’s phone or messaging service. Information you choose to send, including contact details, vehicle or equipment details, location and photos, is sent to Clive through that service. Share only what is needed for your enquiry.</p><p>For questions about information you have provided, contact Clive on <a href="tel:+61474372852">0474 372 852</a>.</p><h2>Website technology</h2><p>This website does not provide an online enquiry form, customer account or payment checkout. We have not added advertising pixels or visitor analytics to the website. Fonts and component files are served with the site.</p><p>The suburb and postcode lookup runs in your browser using a downloaded Victorian locality dataset. Search text is not sent to a lookup provider or saved by this website.</p><p>Website hosting and telecommunications providers can process technical information needed to provide their services. Their own privacy notices also apply. External links open other websites with their own practices.</p><h2>Accessing the content</h2><p>The assembly viewer is optional. Service information and contact details are also available as text. Automatic views change every 3.5 seconds while the viewer is visible. Use Pause to stop the tour and camera motion, Next angle to change view, or choose an assembly. Your device’s reduced motion preference stops automatic movement and slide changes.</p><p>You can use a keyboard to reach links, buttons, the assembly selector and the location search. If something on this website is difficult to use, call or text Clive on <a href="tel:+61474372852">0474 372 852</a>.</p><h2>About this notice</h2><p>This notice describes the website and its contact links. For information about how your enquiry or job records are handled beyond the website, contact Clive directly.</p>'''
for path,title,desc,content in [('/service-information/','Service Information | Sampson Heavy Diesel Services','Booking enquiries, scope, charges, consumer rights and contact information for Sampson Heavy Diesel Services.',info),('/privacy/','Privacy and Website Access | Sampson Heavy Diesel','How contact links and locality lookup work, website technology and accessibility help for Sampson Heavy Diesel Services.',privacy)]:
 page(path,title,desc,'<section class="section"><div class="wrap legal-prose">'+content+'</div></section>',[breadcrumbs(path,title.split(' | ')[0])])

manifest=json.loads((ROOT/'components.js').read_text().split('=',1)[1].strip().rstrip(';'))
records=json.loads((ROOT.parent/'scripts/assembly-sources.json').read_text())
records_by_file={record['file']:record for record in records}
credits='<h1>Images and model credits</h1><p>The original photograph of Clive Sampson was supplied for the business website. The standalone illustrated portrait is derived from that photograph and is used separately from the business logo. The Sampson equipment logo is commissioned illustrated branding. Vehicle and machinery illustrations are not photographs of customer work.</p><h2>Complete assembly and machinery models</h2><p>Ten licensed 3D models show complete assemblies and machinery. They include scans of real objects and authored 3D models. Geometry and textures have been optimized for web display. Materials, lighting, framing and camera motion have been adapted. These are illustrative examples and do not imply manufacturer affiliation or a commitment to service every model shown.</p><div class="credits-list">'
for c in manifest:
 record=records_by_file[c['file']]
 credits+=f'<article><h2>{c["name"]}</h2><p>By {html.escape(c["creator"])}. <a href="{c["source"]}" target="_blank" rel="noopener">Original model</a>. Licensed under <a href="{c["licenseUrl"]}" target="_blank" rel="noopener">{c["license"]}</a>.</p><p>{html.escape(record["changes"])}</p></article>'
credits+='</div><h2>Locality data</h2><p>Locality and postcode data derived from <a href="https://discover.data.vic.gov.au/en_AU/dataset/vicmap-address-rest-api">Vicmap Address</a>. © State of Victoria, Department of Transport and Planning. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Selected, deduplicated and formatted for this lookup. Snapshot 1 October 2026. No street addresses or individual property records are included.</p><h2>Fonts and rendering software</h2><p>Barlow and Barlow Condensed by Jeremy Tribby, under the SIL Open Font License. Three.js under the MIT licence. Meshoptimizer under the MIT licence. Licence files are included with the website assets.</p>'
page('/credits/','Image and Component Credits | Sampson Heavy Diesel','Sources and licences for complete assembly and machinery models, website artwork, fonts and Victorian locality data.','<section class="section"><div class="wrap legal-prose">'+credits+'</div></section>',[breadcrumbs('/credits/','Credits')])
# Home page gets the same metadata entities and footer as all other pages.
source=re.sub(r'<script type="application/ld\+json">.*?</script>',ld([schema_service(s) for s in services]),source,flags=re.S)
source=re.sub(r'\s*<footer>.*?</body>',footer+'\n</body>',source,flags=re.S)
source=source.replace('href="#services">Services','href="/services/">Services').replace('href="#coverage">Service area','href="/service-areas/">Service area')
source=source.replace('https://sampson-heavy-diesel.ft-64db.chatgpt.site',ORIGIN)
HOME.write_text(source)
page('/404/','Page Not Found | Sampson Heavy Diesel','Find Sampson Heavy Diesel services or call Clive.',hero('Page not found','Page not found','Browse our heavy diesel services or call Clive Sampson on 0474 372 852.')+'<section class="section"><div class="wrap"><a class="button button-dark" href="/">Return home</a></div></section>',noindex=True)
(ROOT/'404.html').write_text((ROOT/'404/index.html').read_text())
(ROOT/'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n')
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{ORIGIN+p}</loc></url>\n' for p in paths)+'</urlset>\n')
print('Built',len(paths),'crawlable pages; source access stays private until owner approval.')
