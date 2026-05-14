#!/bin/bash
gh run list --branch main --limit 5 --json conclusion,status,name,number --template '{{range .}}{{.number}}: {{.name}} ({{.status}}/{{.conclusion}}){{"\n"}}{{end}}'
