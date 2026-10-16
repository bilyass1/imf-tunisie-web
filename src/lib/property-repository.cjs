// Only explicit public presentation fields leave SQL; reservation notes never do.
async function search(pool,filters,locale,page=1){
 if(!['fr','en','ar'].includes(locale))throw new Error('Invalid locale');
 if(!Number.isSafeInteger(page)||page<1||page>400)throw new Error('Invalid page');
 const values=[filters.q,filters.city,filters.project,filters.status,filters.bedrooms,filters.minPrice,filters.maxPrice,filters.minArea,filters.maxArea,locale];
 const where=`FROM imf_lots l JOIN imf_projects p ON p.slug=l.project_slug WHERE
 ($1='' OR position(lower(translate($1,'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇç','AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')) in lower(translate(concat_ws(' ',l.ref,l.data->>'code',p.data->>'name',p.data->>'city',p.data->'address'->>$10),'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇç','AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')))>0)
 AND ($2='' OR p.data->>'city'=$2) AND ($3='' OR l.project_slug=$3) AND ($4='' OR l.status=$4)
 AND ($5='' OR substring(l.data->>'typology' from '[0-9]+')=$5)
 AND ($6='' OR (l.data->>'price')::numeric>=NULLIF($6,'')::numeric) AND ($7='' OR (l.data->>'price')::numeric<=NULLIF($7,'')::numeric)
 AND ($8='' OR (l.data->>'sellableArea')::numeric>=NULLIF($8,'')::numeric) AND ($9='' OR (l.data->>'sellableArea')::numeric<=NULLIF($9,'')::numeric)`;
 const orders={'reference':'l.project_slug,l.ref','price-asc':"(l.data->>'price')::numeric ASC NULLS LAST,l.project_slug,l.ref",'price-desc':"(l.data->>'price')::numeric DESC NULLS LAST,l.project_slug,l.ref",'area-asc':"(l.data->>'sellableArea')::numeric ASC NULLS LAST,l.project_slug,l.ref",'area-desc':"(l.data->>'sellableArea')::numeric DESC NULLS LAST,l.project_slug,l.ref"};
 const order=orders[filters.sort];if(!order)throw new Error('Invalid sort');
 const select=`SELECT jsonb_build_object('id',p.slug||'/'||l.ref,'project',p.slug,'projectName',p.data->>'name','city',p.data->>'city','address',p.data->'address'->>$10,'mapQuery',p.data->>'mapQuery','ref',l.ref,'code',l.data->>'code','typology',l.data->>'typology','bedrooms',COALESCE(substring(l.data->>'typology' from '[0-9]+')::int,0),'area',l.data->'sellableArea','price',l.data->'price','floor',l.data->'floor','status',l.status,'garden',l.data->'gardenArea','terrace',l.data->'terraceArea','image',COALESCE(l.data->'gallery'->0->>'src',p.data->>'cover'),'progress',COALESCE(l.data->'progressPercent',p.data->'progressPercent')) AS item `;
 const [rows,count,facets]=await Promise.all([
  pool.query(select+where+` ORDER BY ${order} LIMIT 24 OFFSET $11`,[...values,(page-1)*24]),
  pool.query('SELECT count(*)::int AS count '+where,values),
  pool.query(`SELECT (SELECT COALESCE(jsonb_agg(jsonb_build_object('project',slug,'projectName',data->>'name','city',data->>'city') ORDER BY slug),'[]') FROM imf_projects) AS projects,(SELECT COALESCE(jsonb_agg(n ORDER BY n),'[]') FROM (SELECT DISTINCT COALESCE(substring(data->>'typology' from '[0-9]+')::int,0) AS n FROM imf_lots) x) AS bedrooms`)
 ]);
 return {items:rows.rows.map(r=>r.item),total:count.rows[0].count,page,projects:facets.rows[0].projects,bedrooms:facets.rows[0].bedrooms};
}
module.exports={search};
