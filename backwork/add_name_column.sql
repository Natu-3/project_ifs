-- user 테이블에 name 컬럼 추가
ALTER TABLE `user` 
ADD COLUMN `name` VARCHAR(100) NULL AFTER `email`;

-- 기존 데이터가 있다면 기본값 설정 (선택사항)
-- UPDATE `user` SET `name` = '' WHERE `name` IS NULL;

