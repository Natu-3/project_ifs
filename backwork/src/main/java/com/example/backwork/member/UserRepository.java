package com.example.backwork.member;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUserid(String userid);
    Optional<User> findByEmail(String email);
    boolean existsByUserid(String userid);

    boolean existsByEmail(String email);

    default long countBy() {
        return count();
    }

    long countByAuth(String auth);

    @Query("""
            SELECT u
            FROM User u
            WHERE (:keyword IS NULL OR :keyword = ''
                OR LOWER(u.userid) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.name, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(u.email, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<User> searchUsers(@Param("keyword") String keyword, Pageable pageable);
}




