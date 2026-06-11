require 'net/http'
require 'uri'
require 'json'
require 'fileutils'

BASE = 'http://localhost:3099'
BASE_PATH = 'C:/Users/Admin/Desktop/Calude Test/erp-app'

def req(path, method = 'GET', body = nil, cookie_jar = nil)
  uri = URI("#{BASE}#{path}")
  http = Net::HTTP.new(uri.host, uri.port)
  req_class = case method
    when 'GET' then Net::HTTP::Get
    when 'POST' then Net::HTTP::Post
    when 'PUT' then Net::HTTP::Put
    when 'DELETE' then Net::HTTP::Delete
    else Net::HTTP::Get
  end
  request = req_class.new(uri)
  request['Content-Type'] = 'application/json'
  if cookie_jar && cookie_jar['hisecure.sid']
    request['Cookie'] = "hisecure.sid=#{cookie_jar['hisecure.sid']}"
  end
  if body
    request.body = body.to_json
  end
  response = http.request(request)
  jar_out = cookie_jar ? cookie_jar.dup : {}
  if response['Set-Cookie']
    response['Set-Cookie'].each_line do |sc|
      if sc =~ /hisecure\.sid=([^;]+)/
        jar_out['hisecure.sid'] = $1
      end
    end
  end
  begin
    body = JSON.parse(response.body)
  rescue
    body = response.body
  end
  { status: response.code.to_i, body: body, jar: jar_out }
end

# Login
login = req('/api/auth/login', 'POST', { username: 'admin', password: 'admin@123' })
if login[:status] != 200
  puts "LOGIN FAILED: #{login[:body]}"
  exit 1
end
puts "LOGIN OK: #{login[:status]} user_id=#{login[:body]['user']['id']}"
jar = login[:jar]
hdr = jar['hisecure.sid'] ? { 'Cookie' => "hisecure.sid=#{jar['hisecure.sid']}" } : {}

results = {}

# Pre-flight: customer
cust_list = req('/api/customers?limit=1', 'GET', nil, hdr)
cid = cust_list[:body]['data'] && cust_list[:body]['data'][0] && cust_list[:body]['data'][0]['customer_id']
results['customer_seeded'] = cid ? "YES (#{cid})" : 'NONE'

if cid
  # === WORKFLOW 1 (RBAC): Access all modules ===
  modules = [
    '/api/users?limit=1',
    '/api/technicians',
    '/api/complaints?limit=1',
    '/api/amc/contracts?limit=1',
    '/api/repairs?limit=1',
    '/api/tickets?limit=1',
    '/api/settings',
    '/api/dashboard',
    '/api/reports/stats',
    '/api/products?limit=1',
    '/api/customers?limit=1',
    '/api/payments?limit=1',
    '/api/parts?limit=1',
    '/api/suppliers?limit=1',
    '/api/stores?limit=1',
    '/api/invoices?limit=1',
    '/api/accounting?limit=1',
  ]
  modules.each_with_index do |path, i|
    r = req(path, 'GET', nil, hdr)
    status = r[:status]
    ok_flag = r[:body]['ok'] == false ? 'FAIL(ok=false)' : (status == 200 ? 'PASS' : "FAIL(status=#{status})")
    puts "  [#{i+1}/#{modules.length}] #{path.split('?').first.split('/').last}: #{ok_flag}"
    results["rbac_#{i+1}_#{path.split('?').first.split('/').last}"] = ok_flag
  end

  # === WORKFLOW 2: Customer → Complaint → Ticket → Repair ===
  puts "\n=== Workflow 2 ==="
  # 2.1 Create complaint
  comp = req('/api/complaints', 'POST', {
    customer_id: cid,
    subject: 'RubyWF2_Complaint',
    priority: 'medium',
    category: 'service'
  }, hdr)
  results['wf2_create_complaint'] = comp[:status] == 200 ? 'PASS' : "FAIL(#{comp[:body]['error'] rescue comp[:status]})"
  puts "  Create complaint: #{results['wf2_create_complaint']}"
  comp_id = comp[:body]['data'] && comp[:body]['data']['complaint_id']

  if comp_id
    # 2.2 Read complaint
    comp_r = req("/api/complaints/#{comp_id}", 'GET', nil, hdr)
    results['wf2_read_complaint'] = comp_r[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Read complaint: #{results['wf2_read_complaint']}"

    # 2.3 Status: registered -> under_review
    comp_s1 = req("/api/complaints/#{comp_id}/status", 'PUT', { status: 'under_review' }, hdr)
    results['wf2_status_review'] = comp_s1[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Status->under_review: #{results['wf2_status_review']}"

    # 2.4 Status: under_review -> resolved
    comp_s2 = req("/api/complaints/#{comp_id}/status", 'PUT', { status: 'resolved', resolution: 'Fixed via Ruby' }, hdr)
    results['wf2_status_resolved'] = comp_s2[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Status->resolved: #{results['wf2_status_resolved']}"

    # 2.5 Create ticket from complaint
    ticket = req('/api/tickets', 'POST', {
      customer_id: cid,
      subject: 'RubyWF2_Ticket',
      priority: 'medium',
      ticket_type: 'service',
      complaint_id: comp_id,
      description: 'Escalated from complaint'
    }, hdr)
    results['wf2_create_ticket'] = ticket[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Create ticket: #{results['wf2_create_ticket']}"
    ticket_id = ticket[:body]['data'] && ticket[:body]['data']['ticket_id']

    if ticket_id
      # 2.6 Read ticket
      ticket_r = req("/api/tickets/#{ticket_id}", 'GET', nil, hdr)
      results['wf2_read_ticket'] = ticket_r[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  Read ticket: #{results['wf2_read_ticket']}"

      # 2.7 Status: open -> assigned
      tk_s1 = req("/api/tickets/#{ticket_id}", 'PUT', { status: 'assigned' }, hdr)
      results['wf2_ticket_assigned'] = tk_s1[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  Ticket->assigned: #{results['wf2_ticket_assigned']}"

      # 2.8 Status: assigned -> in_progress
      tk_s2 = req("/api/tickets/#{ticket_id}", 'PUT', { status: 'in_progress' }, hdr)
      results['wf2_ticket_progress'] = tk_s2[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  Ticket->in_progress: #{results['wf2_ticket_progress']}"

      # 2.9 Status: in_progress -> closed
      tk_s3 = req("/api/tickets/#{ticket_id}", 'PUT', { status: 'closed' }, hdr)
      results['wf2_ticket_closed'] = tk_s3[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  Ticket->closed: #{results['wf2_ticket_closed']}"

      # 2.10 Search tickets
      search = req('/api/tickets?search=RubyWF2', 'GET', nil, hdr)
      results['wf2_search_tickets'] = search[:status] == 200 && search[:body]['data'] && search[:body]['data'].length > 0 ? 'PASS' : 'FAIL'
      puts "  Search tickets: #{results['wf2_search_tickets']}"

      # 2.11 Filter tickets
      filter = req('/api/tickets?status=closed', 'GET', nil, hdr)
      results['wf2_filter_tickets'] = filter[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  Filter tickets: #{results['wf2_filter_tickets']}"

      # 2.12 Ticket stats
      tk_stats = req('/api/tickets/stats', 'GET', nil, hdr)
      results['wf2_ticket_stats'] = tk_stats[:status] == 200 && tk_stats[:body]['data'] ? 'PASS' : 'FAIL'
      puts "  Ticket stats: #{results['wf2_ticket_stats']}"
    end

    # 2.13 Technicians list
    techs = req('/api/technicians?limit=10', 'GET', nil, hdr)
    results['wf2_technicians'] = techs[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Technicians: #{results['wf2_technicians']}"
  end

  # === WORKFLOW 3: AMC Contract ===
  puts "\n=== Workflow 3 (AMC) ==="
  # 3.1 Create AMC
  amc = req('/api/amc/contracts', 'POST', {
    customer_id: cid,
    contract_type: 'annual',
    start_date: '2026-01-01',
    end_date: '2027-01-01',
    terms: 'RubyWF3 AMC'
  }, hdr)
  results['wf3_create_amc'] = amc[:status] == 200 ? 'PASS' : "FAIL(#{amc[:body]['error'] rescue amc[:status]})"
  puts "  Create AMC: #{results['wf3_create_amc']}"
  amc_id = amc[:body]['data'] && amc[:body]['data']['amc_id']

  if amc_id
    # 3.2 Read AMC
    amc_r = req("/api/amc/contracts/#{amc_id}", 'GET', nil, hdr)
    results['wf3_read_amc'] = amc_r[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Read AMC: #{results['wf3_read_amc']}"

    # 3.3 Activate AMC
    amc_act = req("/api/amc/contracts/#{amc_id}/activate", 'POST', nil, hdr)
    results['wf3_activate_amc'] = amc_act[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Activate AMC: #{results['wf3_activate_amc']}"

    # 3.4 AMC stats
    amc_stats = req('/api/amc/stats', 'GET', nil, hdr)
    results['wf3_amc_stats'] = amc_stats[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  AMC stats: #{results['wf3_amc_stats']}"

    # 3.5 Create AMC asset
    asset = req('/api/amc/assets', 'POST', {
      amc_id: amc_id,
      asset_type: 'equipment',
      serial_number: "RUBY-SN-#{Time.now.to_i}",
      is_active: true
    }, hdr)
    results['wf3_create_asset'] = asset[:status] == 200 ? 'PASS' : "FAIL(#{asset[:body]['error'] rescue asset[:status]})"
    puts "  Create AMC asset: #{results['wf3_create_asset']}"
    asset_id = asset[:body]['data'] && asset[:body]['data']['asset_id']

    if asset_id
      asset_r = req("/api/amc/assets/#{asset_id}", 'GET', nil, hdr)
      results['wf3_read_asset'] = asset_r[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  Read AMC asset: #{results['wf3_read_asset']}"

      # 3.6 List AMC assets
      asset_list = req("/api/amc/assets?amc_id=#{amc_id}", 'GET', nil, hdr)
      results['wf3_list_assets'] = asset_list[:status] == 200 ? 'PASS' : 'FAIL'
      puts "  List AMC assets: #{results['wf3_list_assets']}"
    end

    # 3.7 Filter AMC by customer
    amc_filter = req("/api/amc/contracts?customer_id=#{cid}", 'GET', nil, hdr)
    results['wf3_filter_amc'] = amc_filter[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Filter AMC: #{results['wf3_filter_amc']}"

    # 3.8 AMC contract update
    amc_upd = req("/api/amc/contracts/#{amc_id}", 'PUT', { terms: 'Updated via Ruby validation' }, hdr)
    results['wf3_update_amc'] = amc_upd[:status] == 200 ? 'PASS' : 'FAIL'
    puts "  Update AMC: #{results['wf3_update_amc']}"
  end
end

# Final summary
puts "\n=== SUMMARY ==="
pass_count = results.values.count { |v| v == 'PASS' }
fail_count = results.values.count { |v| v.start_with?('FAIL') || v.start_with?('status=') }
total = results.length
puts "Total tests: #{total}"
puts "Pass: #{pass_count}"
puts "Fail: #{fail_count}"
puts "Verdict: #{fail_count == 0 ? 'PASS' : 'FAIL'}"

report = {
  suite: 'FullValidation',
  timestamp: Time.now.utc.iso8601,
  login_status: login[:status],
  results: results,
  passCount: pass_count,
  failCount: fail_count,
  total: total,
  verdict: fail_count == 0 ? 'PASS' : 'FAIL'
}

outfile = File.join(BASE_PATH, '_results_ruby.json')
File.write(outfile, JSON.pretty_generate(report))
puts "\nResults written to: #{outfile}"
puts JSON.pretty_generate(report)
