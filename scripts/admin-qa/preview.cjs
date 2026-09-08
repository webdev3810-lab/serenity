/* eslint-disable @typescript-eslint/no-require-imports -- These local Node CommonJS tools load CommonJS runtimes. */
/* Isolated read-only component preview. No environment files or credentials.
 * Run: node scripts/admin-qa/preview.cjs
 * All displayed records are synthetic; never use this to validate authorization. */
const fs = require('fs'), path = require('path'), http = require('http');
const { webpack } = require('next/dist/compiled/webpack/webpack');
const root = process.cwd(), here = __dirname, out = path.join(root, '.next/admin-qa');
fs.mkdirSync(out, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const add = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const houses = [7,9,11].map((n,i) => ({ id:`fixture-${n}`, name:`Serenity ${n}`, slug:`serenity-${n}`, location:'Pakenham, Victoria', bedrooms:3, beds:4, bathrooms:2, max_guests:6, nightly_price:240+i*25, minimum_stay:2, maximum_stay:90, maximum_guests:6, maximum_adults:6, maximum_children:4, maximum_corporate_houses:3, minimum_corporate_houses:1, minimum_corporate_stay:7, published:i!==2, featured:i===0, display_order:i, short_description:'A spacious furnished home for family and business stays.', full_description:'Synthetic listing content for local interface testing.', booking_request_required:false, instant_booking_enabled:true, pet_policy:'Pets by arrangement', corporate_booking_allowed:true }));
const bookings = Array.from({length:25}, (_,i) => ({ id:`booking-${i}`, booking_reference:`QA-${100+i}`, property_id:houses[i%3].id, check_in:i<3?date:add(i%10), checkout:add(i%10+4), created_at:date, booking_status:['confirmed','pending_payment','checked_in','cancelled','checked_out'][i%5], payment_status:['paid','pending','refunded','failed'][i%4], booking_type:i%3?'standard':'corporate', total_amount:960, adults:2, guest_details:{firstName:`Test guest ${i+1}`,email:'guest@example.invalid',phone:''}, internal_notes:'' }));
const enquiries = [{ id:'enquiry-1', company_name:'Example Company', contact_name:'Test Contact',email:'contact@example.invalid', arrival:date,departure:add(10), houses_needed:2,status:'pending_approval', property_ids:[houses[0].id], notes:'Synthetic enquiry for interface testing.', created_at:date }];
const users=[{user_id:'user-1',email:'fixture@example.invalid',role:'super_admin',active:true,created_at:date}];
const reviews=[{id:'review-1',property_id:houses[0].id,reviewer_name:'Test reviewer',review_text:'A comfortable stay. This is a synthetic review for local interface checks.',rating:5,published:true,display_order:0}];
const connections=[{id:'feed-1',property_id:houses[0].id,platform:'airbnb',connection_type:'import',is_enabled:true,sync_status:'conflict',last_error:'A synthetic overlap needs review.',last_success_at:new Date().toISOString(),external_calendar_url:'https://example.invalid/calendar.ics'}];
const data={properties:houses,property_images:[],amenities:[],property_reviews:reviews,property_date_prices:[],bookings,calendar_events:[],calendar_connections:connections,enquiries,contact_messages:[{id:'message-1',first_name:'Test',last_name:'Guest',email:'guest@example.invalid',message:'An example contact message with enough text to check wrapping on small screens.',status:'new',created_at:date}],homepage_content:[{published:true,content:{hero_heading:'A place to feel at home.',hero_subtitle:'Furnished houses in Pakenham.',hero_cta_label:'Browse houses',hero_cta_href:'/houses'}}],site_settings:[],property_photo_categories:[]};
const promotions=['active','scheduled','draft','expired','sold_out','disabled'].map((status,i)=>({id:`promotion-${i}`,status,code:`TEST${i+1}`,name:`Test campaign ${i+1}`,badge_text:'Test offer',message:'Synthetic promotion preview',mobile_message:'Test offer',discount_type:'percentage',discount_value:10,starts_at:null,ends_at:null,max_redemptions:25,successful_redemptions:4,remaining_redemptions:21,minimum_booking_amount:0,minimum_nights:2,applicable_property_ids:[],applies_to_corporate:true,stackable:false,restore_on_refund:false,active:status==='active',published:status==='active',header_visible:false}));
webpack({ mode:'development', devtool:false, entry:path.join(here,'entry.tsx'), output:{path:out,filename:'bundle.js'}, resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root,'next/navigation':path.join(here,'navigation.ts'),'next/image':path.join(here,'image.tsx'),[path.join(root,'src/lib/supabase/client')]:path.join(here,'client.ts')}}, module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(here,'loader.cjs')}]}, plugins:[new webpack.DefinePlugin({'process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify(''),'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':JSON.stringify('')})], optimization:{minimize:false} },(error,stats)=>{
 if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return;}
 const chunks=path.join(root,'.next/dev/static/chunks');
 const globalCss=fs.readdirSync(chunks).find(name=>name.startsWith('app_globals_')&&name.endsWith('.css'));
 if(!globalCss)throw new Error('Open localhost:3000/admin/login with npm run dev first to generate the public CSS.');
 const styles=fs.readFileSync(path.join(chunks,globalCss),'utf8')+'\n'+fs.readFileSync(path.join(root,'app/admin/admin.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'app/property-stay.css'),'utf8');
 const server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://localhost');
   if(req.method!=='GET'){res.writeHead(405,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Read-only fixture: this operation is intentionally disabled.'}));return;}
   if(url.pathname==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(out,'bundle.js')));return;}
   if(url.pathname==='/styles.css'){res.setHeader('Content-Type','text/css');res.end(styles);return;}
   let json;
   if(url.pathname.startsWith('/fixtures/'))json=data[url.pathname.slice(10)]??[];
   else if(url.pathname==='/api/admin/users')json={users};
   else if(url.pathname==='/api/admin/promotions')json={promotions};
   else if(url.pathname==='/api/admin/hero-media')json={media:[]};
   else if(url.pathname==='/api/admin/calendar/connections')json={properties:houses.map(h=>({...h,connections:connections.filter(c=>c.property_id===h.id),conflicts:[],directBlocks:[],calendarItems:[]}))};
   else if(url.pathname.startsWith('/api/'))json={error:'No fixture is defined for this endpoint.'};
   if(json!==undefined){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(json));return;}
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Serenity · isolated synthetic fixture</title><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });server.listen(4107,'127.0.0.1',()=>console.log('Read-only synthetic component preview: http://127.0.0.1:4107/admin'));
});
