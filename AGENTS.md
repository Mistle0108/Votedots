# AGENTS.md

## 목적
- 이 저장소는 Votedots 프로젝트 코드 저장소다.
- 이 저장소에서 시작한 세션은 프로젝트 코드 확인, 설계, 구현, 검증을 기본 작업으로 본다.
- wiki 관련 요청은 현재 저장소 내부가 아니라 연결된 외부 wiki 저장소를 기준으로 처리한다.
- 이 문서는 프로젝트 세션의 bootstrap 규칙만 다루고, wiki 내부 상세 규칙은 연결된 wiki 저장소의 `AGENTS.md`와 `wiki/AGENTS.md`를 따른다.

## 기준 진실 우선순위
```text
code@commit
> merged PR
> open PR
> issue
> wiki
> output/session
```

## 세션 기본 규칙
- 이 파일은 세션 시작 시 1회 읽는 기본 규칙 문서로 본다.
- 같은 세션에서는 이 파일을 매 요청마다 다시 읽지 않고, 이미 확인한 규칙을 재사용한다.
- 브랜치 변경, 저장소 변경, 규칙 변경 요청, 현재 세션에서 `AGENTS.md` 수정이 있었을 때만 다시 읽는다.
- 로컬 워킹트리를 최신 기준으로 추정하지 않는다.

## 프로젝트 wiki bootstrap 규칙
- 사용자가 `wiki`, `위키`, `문서`, `wiki 기준`, `wiki 최신`, `wiki 반영`, `wiki 동기화` 같은 표현을 쓰면 먼저 프로젝트 저장소의 `./.local/wiki-repo.yml`을 읽는다.
- 현재 shell이 WSL이면 `wiki_repo_paths.wsl`, Windows shell이면 `wiki_repo_paths.windows`를 사용한다.
- 현재 shell 슬롯에 경로가 있고 현재 세션에서 접근 가능하면, 그 경로를 이번 세션의 연결된 외부 wiki 저장소로 확정한다.
- 경로가 없거나 접근할 수 없으면 사용자에게 경로를 한 번만 확인하고, 현재 shell 슬롯에 저장한 뒤 이후 기본값으로 재사용한다.
- 경로를 확인하기 전에는 현재 프로젝트 저장소의 `wiki` 폴더, `wiki` 문자열이 포함된 브랜치, 기타 로컬 파일을 연결된 wiki 저장소로 추정하지 않는다.

## wiki 최신 기준
- wiki 읽기, wiki 최신 여부 확인, wiki 반영 여부 판단은 모두 연결된 외부 wiki 저장소에서 수행한다.
- 사용자의 각 wiki 요청이나 중요한 판단 단계 전에 해당 wiki 저장소에서 `git fetch origin main`을 실행하고 `origin/main@<hash>`를 기준 ref로 확정한다.
- `git fetch`가 성공하면 읽기와 판단은 원칙적으로 `origin/main@<hash>` 기준으로 수행한다.
- `git fetch`가 실패하면 최신이라고 단정하지 않고, 실패 사유와 마지막으로 확인 가능한 기준 `branch + commit`을 먼저 알린다.
- 커밋된 wiki 문서는 원칙적으로 `git show <ref>:<path>`로 먼저 읽고, 워킹트리 파일 읽기는 fallback일 때만 사용한다.

## 프로젝트 기준 기본값
- 사용자가 프로젝트 기준을 따로 지정하지 않으면 프로젝트 기준은 현재 체크아웃된 브랜치의 `HEAD@commit`으로 본다.
- 사용자가 `main 최신 merged PR`, `특정 PR`, `특정 commit`을 명시하면 그 기준을 우선한다.
- 미커밋 워킹트리 변경은 사용자가 명시적으로 포함하라고 하지 않으면 기본 비교 대상에 넣지 않는다.

## 프로젝트와 wiki 역할 분리
- 프로젝트 코드 확인, 설계, 구현, 검증은 프로젝트 저장소에서 수행한다.
- wiki 저장소는 문서 조회, 반영 범위 확인, wiki 브랜치 작업, wiki commit, wiki PR 생성 용도로만 사용한다.
- 프로젝트 브랜치와 wiki 브랜치는 서로 다른 저장소에서 관리한다.

## 요청 해석 기본값
- `wiki 저장소 최신이야?`라고 물으면 연결된 외부 wiki 저장소의 원격 기준 최신 여부를 확인하는 뜻으로 해석한다.
- `wiki 최신 동기화 여부를 확인해줘`라고 물으면 연결된 외부 wiki 저장소에서 `origin/main@<hash>` 기준 최신 상태를 확인하는 뜻으로 해석한다.
- `프로젝트 최신 변경이 wiki에 반영됐는지 확인해줘`라고 물으면 프로젝트의 확정된 `code@commit` 기준과 wiki의 `origin/main@<hash>` 기준 문서를 비교하는 뜻으로 해석한다.

## 로컬 설정 파일
- `./.local/wiki-repo.yml`은 개인 로컬 설정 파일이다.
- 이 파일은 git에 올리지 않는다.
- 이 파일에는 현재 shell에서 접근 가능한 wiki 저장소 경로만 저장한다.
- 최소 형식은 아래와 같다.

```yaml
wiki_repo_paths:
  windows: <windows-path-to-wiki-repo>
  wsl: <wsl-path-to-wiki-repo>
```
