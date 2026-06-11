require 'json'
require 'fileutils'

results_dir = ARGV[0] || "C:/Users/Admin/Desktop/Calude Test/erp-app"
rbac_file = File.join(results_dir, '_results_rbac.json')
wf2_file  = File.join(results_dir, '_results_wf2.json')
wf3_file  = File.join(results_dir, '_results_wf3.json')

summary = {
  rbac: File.exist?(rbac_file) ? JSON.parse(File.read(rbac_file)) : nil,
  wf2:  File.exist?(wf2_file)  ? JSON.parse(File.read(wf2_file))  : nil,
  wf3:  File.exist?(wf3_file)  ? JSON.parse(File.read(wf3_file))  : nil,
}
puts JSON.pretty_generate(summary)
