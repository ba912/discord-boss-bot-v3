#!/bin/bash

# AI Context Status Script
# 새로운 AI 세션 시작 시 실행하여 현재 상태 파악

echo "🤖 ===== Discord Boss Bot v3 - AI 세션 시작 ====="
echo ""

echo "📍 현재 위치:"
pwd
echo ""

echo "🔄 Git 상태:"
echo "브랜치: $(git branch --show-current)"
echo "마지막 커밋:"
git log --oneline -3
echo ""

echo "📝 변경된 파일:"
git status --porcelain
if [ $? -eq 0 ] && [ -z "$(git status --porcelain)" ]; then
    echo "변경사항 없음 (clean working tree)"
fi
echo ""

echo "📋 현재 작업 상황:"
if [ -f ".ai-context/current-work.md" ]; then
    echo "✅ 현재 작업 파일 존재"
    echo ""
    echo "--- 최근 작업 상황 ---"
    head -20 .ai-context/current-work.md
    echo "..."
else
    echo "❌ 현재 작업 파일 없음 - .ai-context/current-work.md를 먼저 확인하세요"
fi
echo ""

echo "🔍 필수 체크 항목:"
echo "[ ] .ai-context/current-work.md 읽기"
echo "[ ] .ai-context/codebase-overview.md 읽기" 
echo "[ ] CLAUDE.md 읽기"
echo "[ ] 사용자 요청사항 확인"
echo ""

echo "🚀 작업 준비 완료!"
echo "======================================"